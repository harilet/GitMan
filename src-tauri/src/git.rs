use std::path::{Path, PathBuf};
use std::process::Command;

use git2::build::CheckoutBuilder;
use git2::{
    BranchType, DiffFormat, DiffOptions, IndexAddOption, Repository, Status, StatusOptions,
};
use serde::Serialize;

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

fn open(path: &Path) -> Result<Repository, String> {
    Repository::open(path).map_err(|e| e.message().to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoInfo {
    path: String,
    name: String,
    branch: String,
    head: String,
    detached: bool,
    unborn: bool,
    dirty: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileStatus {
    path: String,
    index: String,
    worktree: String,
    staged: bool,
    unstaged: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitInfo {
    oid: String,
    short: String,
    summary: String,
    message: String,
    author: String,
    email: String,
    time: i64,
    parents: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchInfo {
    name: String,
    is_head: bool,
    is_remote: bool,
    upstream: Option<String>,
    target: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteInfo {
    name: String,
    url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagInfo {
    name: String,
    target: String,
    message: String,
    annotated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StashInfo {
    index: usize,
    message: String,
    oid: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserConfig {
    name: String,
    email: String,
}

fn short(oid: git2::Oid) -> String {
    let s = oid.to_string();
    s.chars().take(7).collect()
}

fn current_branch(repo: &Repository) -> (String, bool, bool) {
    match repo.head() {
        Ok(head) => {
            if repo.head_detached().unwrap_or(false) {
                ("(detached HEAD)".to_string(), true, false)
            } else {
                (
                    head.shorthand().unwrap_or("HEAD").to_string(),
                    false,
                    false,
                )
            }
        }
        Err(e) if e.code() == git2::ErrorCode::UnbornBranch => {
            let name = repo
                .find_reference("HEAD")
                .ok()
                .and_then(|r| r.symbolic_target().map(String::from))
                .and_then(|t| t.strip_prefix("refs/heads/").map(String::from))
                .unwrap_or_else(|| "main".to_string());
            (name, false, true)
        }
        Err(_) => ("(unknown)".to_string(), false, true),
    }
}

fn repo_info(path: &Path, repo: &Repository) -> RepoInfo {
    let (branch, detached, unborn) = current_branch(repo);
    let head = repo
        .head()
        .ok()
        .and_then(|h| h.target())
        .map(short)
        .unwrap_or_else(|| "".to_string());

    let mut opts = StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);
    let dirty = repo
        .statuses(Some(&mut opts))
        .map(|s| !s.is_empty())
        .unwrap_or(false);

    RepoInfo {
        path: path.to_string_lossy().to_string(),
        name: path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.to_string_lossy().to_string()),
        branch,
        head,
        detached,
        unborn,
        dirty,
    }
}

#[tauri::command]
pub fn open_repository(path: String) -> Result<RepoInfo, String> {
    let p = PathBuf::from(&path);
    let repo = open(&p)?;
    // Worktrees expose the main workdir via workdir().
    let info_path = repo.workdir().unwrap_or(&p).to_path_buf();
    Ok(repo_info(&info_path, &repo))
}

#[tauri::command]
pub fn init_repository(path: String) -> Result<RepoInfo, String> {
    let p = PathBuf::from(&path);
    std::fs::create_dir_all(&p).map_err(err)?;
    let repo = Repository::init(&p).map_err(|e| e.message().to_string())?;
    Ok(repo_info(&p, &repo))
}

#[tauri::command]
pub fn get_repository_info(repository: String) -> Result<RepoInfo, String> {
    let path = PathBuf::from(&repository);
    let repo = open(&path)?;
    Ok(repo_info(&path, &repo))
}

#[tauri::command]
pub fn clone_repository(
    url: String,
    destination: String,
) -> Result<RepoInfo, String> {
    let dest = PathBuf::from(&destination);
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(err)?;
    }
    let out = Command::new("git")
        .args(["clone", "--progress", &url, &destination])
        .output()
        .map_err(|e| format!("Failed to run git: {e}"))?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).to_string());
    }
    let repo = open(&dest)?;
    Ok(repo_info(&dest, &repo))
}

fn status_letters(s: Status) -> (String, bool, bool) {
    if s.contains(Status::CONFLICTED) {
        return ("U".to_string(), true, true);
    }
    let idx = if s.contains(Status::INDEX_NEW) {
        "A"
    } else if s.contains(Status::INDEX_MODIFIED) {
        "M"
    } else if s.contains(Status::INDEX_DELETED) {
        "D"
    } else if s.contains(Status::INDEX_RENAMED) {
        "R"
    } else if s.contains(Status::INDEX_TYPECHANGE) {
        "T"
    } else {
        " "
    };
    let wt = if s.contains(Status::WT_NEW) {
        "?"
    } else if s.contains(Status::WT_MODIFIED) {
        "M"
    } else if s.contains(Status::WT_DELETED) {
        "D"
    } else if s.contains(Status::WT_RENAMED) {
        "R"
    } else if s.contains(Status::WT_TYPECHANGE) {
        "T"
    } else {
        " "
    };
    (format!("{idx}{wt}"), idx != " ", wt != " ")
}

#[tauri::command]
pub fn get_status(repository: String) -> Result<Vec<FileStatus>, String> {
    let path = PathBuf::from(&repository);
    let repo = open(&path)?;
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);
    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| e.message().to_string())?;

    let mut out = Vec::new();
    for entry in statuses.iter() {
        let s = entry.status();
        let (letters, staged, unstaged) = status_letters(s);
        let p = entry.path().unwrap_or("<non-utf8>").to_string();
        let (index, worktree) = (
            letters.chars().next().unwrap_or(' ').to_string(),
            letters.chars().nth(1).unwrap_or(' ').to_string(),
        );
        out.push(FileStatus {
            path: p,
            index,
            worktree,
            staged,
            unstaged,
        });
    }
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

fn stage_path(repo: &Repository, path: &str) -> Result<(), String> {
    let mut index = repo.index().map_err(err)?;
    index.add_path(Path::new(path)).map_err(err)?;
    index.write().map_err(err)?;
    Ok(())
}

#[tauri::command]
pub fn stage_file(path: String, repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    stage_path(&repo, &path)
}

#[tauri::command]
pub fn unstage_file(path: String, repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    let head = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
    let target = head.as_ref().map(|t| t.as_object());
    repo.reset_default(target, [Path::new(&path)])
        .map_err(|e| e.message().to_string())?;
    Ok(())
}

#[tauri::command]
pub fn stage_all(repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    let mut index = repo.index().map_err(err)?;
    index
        .add_all(["."], IndexAddOption::DEFAULT, None)
        .map_err(err)?;
    index.update_all(["."], None).map_err(err)?;
    index.write().map_err(err)?;
    Ok(())
}

#[tauri::command]
pub fn unstage_all(repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    let head = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
    let target = head.as_ref().map(|t| t.as_object());
    repo.reset_default(target, None::<&str>)
        .map_err(|e| e.message().to_string())?;
    Ok(())
}

#[tauri::command]
pub fn discard_file(path: String, repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;

    let status = repo.status_file(Path::new(&path)).map_err(err)?;
    if status.contains(Status::WT_NEW) {
        let full = repo.workdir().unwrap_or(&p).join(&path);
        if full.is_dir() {
            std::fs::remove_dir_all(&full).map_err(err)?;
        } else {
            std::fs::remove_file(&full).map_err(err)?;
        }
        return Ok(());
    }

    let head = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
    let target = head.as_ref().map(|t| t.as_object());
    repo.reset_default(target, [Path::new(&path)])
        .map_err(|e| e.message().to_string())?;
    let mut cb = CheckoutBuilder::new();
    cb.path(&path).force();
    repo.checkout_head(Some(&mut cb))
        .map_err(|e| e.message().to_string())?;
    Ok(())
}

#[tauri::command]
pub fn commit(
    message: String,
    author_name: Option<String>,
    author_email: Option<String>,
    repository: String,
) -> Result<String, String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    if message.trim().is_empty() {
        return Err("Commit message cannot be empty".to_string());
    }
    let mut index = repo.index().map_err(err)?;
    let tree_oid = index.write_tree().map_err(|_| {
        "Unable to write tree. Resolve all conflicts before committing.".to_string()
    })?;
    let tree = repo.find_tree(tree_oid).map_err(err)?;

    let sig = match (author_name, author_email) {
        (Some(n), Some(e)) if !n.trim().is_empty() && !e.trim().is_empty() => {
            git2::Signature::now(n.trim(), e.trim()).map_err(err)?
        }
        _ => repo
            .signature()
            .map_err(|_| "Git user.name / user.email are not configured".to_string())?,
    };

    let parent = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
    let parents: Vec<&git2::Commit> = parent.iter().collect();
    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| e.message().to_string())?;
    Ok(oid.to_string())
}

#[tauri::command]
pub fn get_log(limit: Option<usize>, repository: String) -> Result<Vec<CommitInfo>, String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    let limit = limit.unwrap_or(200);

    let mut walk = repo.revwalk().map_err(err)?;
    if walk.push_head().is_err() {
        return Ok(Vec::new());
    }
    walk.set_sorting(git2::Sort::TIME).map_err(err)?;

    let mut out = Vec::new();
    for oid in walk.take(limit) {
        let oid = oid.map_err(err)?;
        let commit = repo.find_commit(oid).map_err(err)?;
        let author = commit.author();
        out.push(CommitInfo {
            oid: oid.to_string(),
            short: short(oid),
            summary: commit.summary().unwrap_or("").to_string(),
            message: commit.message().unwrap_or("").to_string(),
            author: author.name().unwrap_or("").to_string(),
            email: author.email().unwrap_or("").to_string(),
            time: commit.time().seconds(),
            parents: commit.parent_ids().map(|p| p.to_string()).collect(),
        });
    }
    Ok(out)
}

fn diff_to_string(repo: &Repository, diff: git2::Diff) -> Result<String, String> {
    let _ = repo;
    let mut text = String::new();
    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        let origin = line.origin();
        if matches!(origin, '+' | '-' | ' ' | '=') {
            text.push(origin);
        }
        text.push_str(&String::from_utf8_lossy(line.content()));
        true
    })
    .map_err(err)?;
    Ok(text)
}

#[tauri::command]
pub fn get_worktree_diff(
    path: Option<String>,
    staged: bool,
    repository: String,
) -> Result<String, String> {
    let repo_root = PathBuf::from(&repository);
    let repo = open(&repo_root)?;
    let mut opts = DiffOptions::new();
    opts.include_typechange(true)
        .include_untracked(true)
        .recurse_untracked_dirs(true)
        .show_untracked_content(true);
    if let Some(path) = &path {
        opts.pathspec(path);
    }

    let diff = if staged {
        let head = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
        repo.diff_tree_to_index(head.as_ref(), None, Some(&mut opts))
    } else {
        repo.diff_index_to_workdir(None, Some(&mut opts))
    }
    .map_err(err)?;

    diff_to_string(&repo, diff)
}

#[tauri::command]
pub fn get_commit_diff(oid: String, repository: String) -> Result<String, String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    let oid = git2::Oid::from_str(&oid).map_err(err)?;
    let commit = repo.find_commit(oid).map_err(err)?;
    let tree = commit.tree().map_err(err)?;
    let parent_tree = if commit.parent_count() > 0 {
        commit.parent(0).ok().and_then(|p| p.tree().ok())
    } else {
        None
    };
    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)
        .map_err(err)?;
    diff_to_string(&repo, diff)
}

#[tauri::command]
pub fn list_branches(repository: String) -> Result<Vec<BranchInfo>, String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    let mut out = Vec::new();
    for item in repo.branches(None).map_err(err)? {
        let (branch, btype) = item.map_err(err)?;
        let name = branch.name().ok().flatten().unwrap_or("").to_string();
        let upstream = branch
            .upstream()
            .ok()
            .and_then(|u| u.name().ok().flatten().map(String::from));
        out.push(BranchInfo {
            name,
            is_head: branch.is_head(),
            is_remote: btype == BranchType::Remote,
            upstream,
            target: branch.get().target().map(|o| o.to_string()),
        });
    }
    out.sort_by(|a, b| (a.is_remote, &a.name).cmp(&(b.is_remote, &b.name)));
    Ok(out)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchGraphNode {
    name: String,
    is_head: bool,
    is_remote: bool,
    tip: String,
    tip_short: String,
    /// Branch this one was forked from (its "parent"), if determinable.
    parent: Option<String>,
    /// Branches this branch has been merged into.
    merges_into: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchGraph {
    nodes: Vec<BranchGraphNode>,
    head: String,
}

#[tauri::command]
pub fn get_branch_graph(
    repository: String,
    include_remote: bool,
) -> Result<BranchGraph, String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;

    struct Br {
        name: String,
        is_head: bool,
        is_remote: bool,
        tip: git2::Oid,
    }

    let mut branches: Vec<Br> = Vec::new();
    for item in repo.branches(None).map_err(err)? {
        let (branch, btype) = item.map_err(err)?;
        let is_remote = btype == BranchType::Remote;
        if is_remote && !include_remote {
            continue;
        }
        let name = match branch.name().ok().flatten() {
            Some(n) => n.to_string(),
            None => continue,
        };
        if is_remote && name.ends_with("/HEAD") {
            continue;
        }
        let tip = match branch.get().target() {
            Some(t) => t,
            None => continue,
        };
        branches.push(Br {
            name,
            is_head: branch.is_head(),
            is_remote,
            tip,
        });
    }

    let (head_name, _, _) = current_branch(&repo);

    // First-parent chain of each branch, used to tell "merged into" apart from
    // a plain linear continuation.
    let mut first_parent: Vec<std::collections::HashSet<git2::Oid>> =
        Vec::with_capacity(branches.len());
    for b in &branches {
        let mut set = std::collections::HashSet::new();
        let mut cur = repo.find_commit(b.tip).ok();
        while let Some(c) = cur {
            if !set.insert(c.id()) {
                break;
            }
            cur = if c.parent_count() > 0 {
                c.parent(0).ok()
            } else {
                None
            };
        }
        first_parent.push(set);
    }

    let mut nodes: Vec<BranchGraphNode> = Vec::with_capacity(branches.len());
    for (i, b) in branches.iter().enumerate() {
        // Parent: the branch whose line most recently joins B's own first-parent
        // line. Handles linear descendants, forks from a since-advanced branch,
        // and forks from a branch that later merged B back in.
        let mut parent: Option<(String, i64)> = None;
        for (j, a) in branches.iter().enumerate() {
            if i == j || a.tip == b.tip {
                continue;
            }
            let a_is_ancestor = repo.graph_descendant_of(b.tip, a.tip).unwrap_or(false);
            let b_is_ancestor = repo.graph_descendant_of(a.tip, b.tip).unwrap_or(false);

            let shared: Option<git2::Oid> = if a_is_ancestor {
                // A's tip is in B's history: a real ancestor only if it is on
                // B's first-parent line, otherwise A was merged into B.
                if first_parent[i].contains(&a.tip) {
                    Some(a.tip)
                } else {
                    None
                }
            } else if b_is_ancestor {
                // A contains B (e.g. B was merged into A). Find the point on
                // A's first-parent line where B originally forked off.
                let mut cur = repo.find_commit(a.tip).ok();
                let mut found = None;
                while let Some(c) = cur {
                    if c.id() == b.tip
                        || repo.graph_descendant_of(b.tip, c.id()).unwrap_or(false)
                    {
                        found = Some(c.id());
                        break;
                    }
                    cur = if c.parent_count() > 0 {
                        c.parent(0).ok()
                    } else {
                        None
                    };
                }
                match found {
                    Some(sp) if sp != b.tip => Some(sp),
                    _ => None,
                }
            } else {
                // Divergent branches: they forked at their merge-base.
                match repo.merge_base(a.tip, b.tip) {
                    Ok(mb) if first_parent[i].contains(&mb) => Some(mb),
                    _ => None,
                }
            };

            if let Some(sp) = shared {
                let t = repo
                    .find_commit(sp)
                    .map(|c| c.time().seconds())
                    .unwrap_or(0);
                match &parent {
                    Some((_, pt)) if *pt >= t => {}
                    _ => parent = Some((a.name.clone(), t)),
                }
            }
        }
        let mut parent_name = parent.map(|(n, _)| n);

        // Break 2-cycles: if A chose B as its parent too, keep only the link to
        // the branch with the older tip (the likely base branch).
        if let Some(pname) = &parent_name {
            if let Some(pj) = branches.iter().position(|x| &x.name == pname) {
                if pj != i {
                    let p_time = repo
                        .find_commit(branches[pj].tip)
                        .map(|c| c.time().seconds())
                        .unwrap_or(0);
                    let b_time = repo
                        .find_commit(b.tip)
                        .map(|c| c.time().seconds())
                        .unwrap_or(0);
                    let b_is_ancestor_p =
                        repo.graph_descendant_of(b.tip, branches[pj].tip).unwrap_or(false);
                    if !b_is_ancestor_p && b_time > p_time {
                        // B's tip is newer; assume the other branch is the base,
                        // so drop this link.
                        parent_name = None;
                    }
                }
            }
        }

        // Merges: branch C contains this branch's tip through a merge commit
        // (i.e. reachable, but not on C's first-parent line). Only report direct
        // merges, not ones already folded into C via an earlier merge.
        let mut merges_into = Vec::new();
        for (j, c) in branches.iter().enumerate() {
            if i == j || c.tip == b.tip {
                continue;
            }
            if first_parent[j].contains(&b.tip) {
                continue;
            }
            if !repo.graph_descendant_of(c.tip, b.tip).unwrap_or(false) {
                continue;
            }
            // If B is already in C's first-parent line, this is a transitive merge.
            let c_first_parent = repo.find_commit(c.tip).ok().and_then(|cc| {
                if cc.parent_count() > 0 {
                    cc.parent(0).ok()
                } else {
                    None
                }
            });
            if let Some(fp) = &c_first_parent {
                if repo.graph_descendant_of(fp.id(), b.tip).unwrap_or(false) {
                    continue;
                }
            }
            merges_into.push(c.name.clone());
        }

        nodes.push(BranchGraphNode {
            name: b.name.clone(),
            is_head: b.is_head,
            is_remote: b.is_remote,
            tip: b.tip.to_string(),
            tip_short: short(b.tip),
            parent: parent_name,
            merges_into,
        });
    }

    Ok(BranchGraph {
        nodes,
        head: head_name,
    })
}

#[tauri::command]
pub fn create_branch(
    name: String,
    checkout: bool,    repository: String,
) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    let head = repo
        .head()
        .and_then(|h| h.peel_to_commit())
        .map_err(|_| "Cannot create a branch before the first commit".to_string())?;
    repo.branch(&name, &head, false)
        .map_err(|e| e.message().to_string())?;
    if checkout {
        checkout_branch_impl(&repo, &name)?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_branch(name: String, force: bool, repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    if force {
        let refname = format!("refs/heads/{name}");
        let mut reference = repo
            .find_reference(&refname)
            .map_err(|e| e.message().to_string())?;
        reference.delete().map_err(|e| e.message().to_string())?;
    } else {
        let mut branch = repo
            .find_branch(&name, BranchType::Local)
            .map_err(|e| e.message().to_string())?;
        branch.delete().map_err(|e| e.message().to_string())?;
    }
    Ok(())
}

fn checkout_branch_impl(repo: &Repository, name: &str) -> Result<(), String> {
    // Local branch: check it out directly.
    if repo.find_branch(name, BranchType::Local).is_ok() {
        return do_checkout(repo, name);
    }

    // Remote-tracking branch (e.g. "origin/feature"): create a local branch
    // that tracks it, then check that out.
    if repo.find_branch(name, BranchType::Remote).is_ok() {
        if let Some((_, short)) = name.split_once('/') {
            if repo.find_branch(short, BranchType::Local).is_err() {
                let remote = repo
                    .find_branch(name, BranchType::Remote)
                    .map_err(|e| e.message().to_string())?;
                let commit = remote
                    .get()
                    .peel_to_commit()
                    .map_err(|e| e.message().to_string())?;
                let mut local = repo
                    .branch(short, &commit, false)
                    .map_err(|e| e.message().to_string())?;
                local
                    .set_upstream(Some(name))
                    .map_err(|e| e.message().to_string())?;
            }
            return do_checkout(repo, short);
        }
    }

    do_checkout(repo, name)
}

fn do_checkout(repo: &Repository, name: &str) -> Result<(), String> {
    let (object, reference) = repo
        .revparse_ext(name)
        .map_err(|e| e.message().to_string())?;
    let mut cb = CheckoutBuilder::new();
    cb.safe();
    repo.checkout_tree(&object, Some(&mut cb))
        .map_err(|e| e.message().to_string())?;
    match reference {
        Some(r) => {
            let refname = r.name().ok_or("invalid reference name")?.to_string();
            repo.set_head(&refname).map_err(|e| e.message().to_string())?;
        }
        None => {
            let oid = object.id();
            repo.set_head_detached(oid)
                .map_err(|e| e.message().to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn checkout_branch(name: String, repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    checkout_branch_impl(&repo, &name)
}

#[tauri::command]
pub fn merge_branch(name: String, repository: String) -> Result<String, String> {
    let p = PathBuf::from(&repository);
    let out = Command::new("git")
        .current_dir(&p)
        .args(["merge", "--no-edit", &name])
        .output()
        .map_err(|e| format!("Failed to run git: {e}"))?;
    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
    if out.status.success() {
        Ok(stdout)
    } else {
        Err(format!("{stdout}{stderr}").trim().to_string())
    }
}

#[tauri::command]
pub fn list_remotes(repository: String) -> Result<Vec<RemoteInfo>, String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    let remotes = repo.remotes().map_err(err)?;
    let mut out = Vec::new();
    for name in remotes.iter().flatten() {
        let url = repo
            .find_remote(name)
            .ok()
            .and_then(|r| r.url().map(String::from))
            .unwrap_or_default();
        out.push(RemoteInfo {
            name: name.to_string(),
            url,
        });
    }
    Ok(out)
}

#[tauri::command]
pub fn add_remote(name: String, url: String, repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    repo.remote(&name, &url)
        .map_err(|e| e.message().to_string())?;
    Ok(())
}

#[tauri::command]
pub fn remove_remote(name: String, repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    repo.remote_delete(&name).map_err(|e| e.message().to_string())
}

fn run_git(dir: &Path, args: &[&str]) -> Result<String, String> {
    let out = Command::new("git")
        .current_dir(dir)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run git: {e}"))?;
    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
    if out.status.success() {
        Ok(format!("{stdout}{stderr}").trim().to_string())
    } else {
        Err(format!("{stdout}{stderr}").trim().to_string())
    }
}

#[tauri::command]
pub fn fetch(remote: Option<String>, repository: String) -> Result<String, String> {
    let p = PathBuf::from(&repository);
    let remote = remote.unwrap_or_else(|| "--all".to_string());
    run_git(&p, &["fetch", &remote, "--prune"])
}

#[tauri::command]
pub fn pull(remote: Option<String>, repository: String) -> Result<String, String> {
    let p = PathBuf::from(&repository);
    match remote {
        Some(r) if !r.is_empty() => run_git(&p, &["pull", &r]),
        _ => run_git(&p, &["pull"]),
    }
}

#[tauri::command]
pub fn push(
    remote: Option<String>,
    branch: Option<String>,
    set_upstream: bool,
    repository: String,
) -> Result<String, String> {
    let p = PathBuf::from(&repository);
    let mut args: Vec<String> = vec!["push".to_string()];
    if set_upstream {
        args.push("-u".to_string());
    }
    let remote = remote.unwrap_or_else(|| "origin".to_string());
    args.push(remote);
    if let Some(b) = branch {
        if !b.is_empty() {
            args.push(b);
        }
    }
    let refs: Vec<&str> = args.iter().map(String::as_str).collect();
    run_git(&p, &refs)
}

#[tauri::command]
pub fn list_tags(repository: String) -> Result<Vec<TagInfo>, String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    let mut out = Vec::new();
    repo.tag_foreach(|oid, name| {
        let name = String::from_utf8_lossy(name).to_string();
        if let Some(tag_name) = name.strip_prefix("refs/tags/") {
            if tag_name.ends_with("^{}") {
                return true;
            }
            let (message, annotated) = match repo.find_tag(oid) {
                Ok(tag) => (tag.message().unwrap_or("").trim().to_string(), true),
                Err(_) => (String::new(), false),
            };
            let target = repo
                .find_object(oid, None)
                .ok()
                .and_then(|o| o.peel_to_commit().ok())
                .map(|c| c.id().to_string())
                .unwrap_or_else(|| oid.to_string());
            out.push(TagInfo {
                name: tag_name.to_string(),
                target,
                message,
                annotated,
            });
        }
        true
    })
    .map_err(err)?;
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

#[tauri::command]
pub fn create_tag(
    name: String,
    message: Option<String>,
    target: Option<String>,
    repository: String,
) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    let obj = match target {
        Some(t) if !t.is_empty() => {
            let oid = git2::Oid::from_str(&t).map_err(err)?;
            repo.find_object(oid, None).map_err(err)?
        }
        _ => repo
            .head()
            .and_then(|h| h.peel_to_commit())
            .map(|c| c.into_object())
            .map_err(|_| "No commit to tag".to_string())?,
    };
    match message {
        Some(m) if !m.trim().is_empty() => {
            let sig = repo.signature().map_err(err)?;
            repo.tag(&name, &obj, &sig, &m, false)
                .map_err(|e| e.message().to_string())?;
        }
        _ => {
            repo.tag_lightweight(&name, &obj, false)
                .map_err(|e| e.message().to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn delete_tag(name: String, repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    repo.tag_delete(&name)
        .map_err(|e| e.message().to_string())
}

#[tauri::command]
pub fn list_stashes(repository: String) -> Result<Vec<StashInfo>, String> {
    let p = PathBuf::from(&repository);
    let mut repo = open(&p)?;
    let mut out = Vec::new();
    repo.stash_foreach(|index, message, oid| {
        out.push(StashInfo {
            index,
            message: message.to_string(),
            oid: oid.to_string(),
        });
        true
    })
    .map_err(err)?;
    Ok(out)
}

#[tauri::command]
pub fn create_stash(message: Option<String>, repository: String) -> Result<String, String> {
    let p = PathBuf::from(&repository);
    let mut repo = open(&p)?;
    let sig = repo.signature().map_err(|_| { 
        "Git user.name / user.email are not configured".to_string()
    })?;
    let msg = message.unwrap_or_default();
    let oid = repo
        .stash_save(&sig, &msg, Some(git2::StashFlags::INCLUDE_UNTRACKED))
        .map_err(|e| e.message().to_string())?;
    Ok(oid.to_string())
}

#[tauri::command]
pub fn apply_stash(index: usize, repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let mut repo = open(&p)?;
    repo.stash_apply(index, None)
        .map_err(|e| e.message().to_string())
}

#[tauri::command]
pub fn pop_stash(index: usize, repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let mut repo = open(&p)?;
    repo.stash_pop(index, None)
        .map_err(|e| e.message().to_string())
}

#[tauri::command]
pub fn drop_stash(index: usize, repository: String) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let mut repo = open(&p)?;
    repo.stash_drop(index)
        .map_err(|e| e.message().to_string())
}

#[tauri::command]
pub fn get_user_config(repository: String) -> Result<UserConfig, String> {
    let p = PathBuf::from(&repository);
    let repo = open(&p)?;
    let cfg = repo.config().map_err(err)?;
    Ok(UserConfig {
        name: cfg.get_string("user.name").unwrap_or_default(),
        email: cfg.get_string("user.email").unwrap_or_default(),
    })
}

#[tauri::command]
pub fn set_user_config(
    name: String,
    email: String,
    global: bool,
    repository: String,
) -> Result<(), String> {
    let p = PathBuf::from(&repository);
    let scope = if global { "--global" } else { "--local" };
    if !name.trim().is_empty() {
        run_git(&p, &["config", scope, "user.name", name.trim()])?;
    }
    if !email.trim().is_empty() {
        run_git(&p, &["config", scope, "user.email", email.trim()])?;
    }
    Ok(())
}




