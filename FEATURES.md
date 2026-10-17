# Git GUI — Implemented Features

A desktop Git client built with **Tauri 2 (Rust)** and **SvelteKit 5**. Local
repository operations are performed natively through `git2` (libgit2); network
operations (clone/fetch/pull/push/merge) shell out to the system `git` binary so
the OS credential manager, SSH agent and credential helpers work as configured.

## Repository management

- [x] **Open** an existing repository from a native folder picker
- [x] **Initialize** a new repository in any directory
- [x] **Clone** a remote repository (URL + destination picker)
- [x] **Recent projects** list on the start screen for one-click access
- [x] **Pin / unpin** projects (pinned projects sort to the top)
- [x] Remove projects from the recent list
- [x] Recent projects persisted locally across sessions
- [x] Close the current repository and return to the start screen
- [x] Repository summary: name, full path, current branch, HEAD short SHA, dirty flag
- [x] Automatic re-detection of repository state on refresh

## Working tree / staging

- [x] Status listing split into **Staged** and **Changes** (unstaged/untracked)
- [x] Per-file status codes (`M`, `A`, `D`, `R`, `?`, `U` for conflicts)
- [x] **Stage** / **Unstage** individual files
- [x] **Stage all** / **Unstage all**
- [x] **Discard** changes in a file (restores tracked files, removes untracked files)
- [x] View staged / unstaged diff for any file in the diff panel

## Committing

- [x] Commit staged changes with a message
- [x] `Ctrl/Cmd + Enter` shortcut to commit
- [x] Author name/email shown from repo config (falls back to repo `user.name`/`user.email`)
- [x] Empty-message and conflict guards
- [x] Works on repositories with no prior commits (unborn HEAD)

## History

- [x] Commit log with summary, short SHA, author and relative time
- [x] Commit filter (by message, author or SHA)
- [x] Ref badges on commits (current branch, branches, remote branches, tags)
- [x] View the full patch of any commit (diff against first parent)

## Diffs

- [x] Row-based unified patch renderer with full-width **red/green** highlighting
- [x] Per-line change markers (`+` / `-`) and old/new line numbers
- [x] Distinct file (`F`) and hunk (`H`) headers
- [x] Shared diff panel used by changes, history and commit views

## Git identity

- [x] View the effective commit author name/email
- [x] Set `user.name` / `user.email` for the current project (`--local`)
- [x] Optionally apply the identity globally for all repositories (`--global`)


## Branches

- [x] **Branch graph** view: layed-out topology showing which branch each one was
      forked from (solid edges) and which branches are merged into which (dashed
      arrows), with current branch highlighted
- [x] Optional inclusion of remote-tracking branches in the graph
- [x] List local branches (current branch marked) and remote-tracking branches
- [x] Show each local branch's upstream
- [x] **Create** a branch (optionally check it out immediately)
- [x] **Checkout** a local branch
- [x] **Checkout** a remote branch → creates a local tracking branch automatically
- [x] **Merge** a branch into the current one (`git merge --no-edit`)
- [x] **Delete** a branch, with force-delete confirmation

## Remotes

- [x] List remotes with their URLs
- [x] **Add** a remote (name + URL)
- [x] **Remove** a remote
- [x] **Fetch** a single remote or all remotes (`--prune`)
- [x] **Pull** a remote
- [x] **Push** to a remote; sets upstream (`-u`) automatically when the branch has none
- [x] Current-branch tracking status indicator

## Tags

- [x] List tags with name, target commit and message
- [x] Distinguish **annotated** vs **lightweight** tags
- [x] **Create** a tag (optional message → annotated, optional target commit, default HEAD)
- [x] **Delete** a tag

## Stashes

- [x] List stashes (index, message, OID)
- [x] **Create** a stash (optional message, includes untracked files)
- [x] **Apply**, **Pop** and **Drop** stashes

## UI / UX

- [x] **Custom frameless window**: native decorations disabled; own title bar with
      drag region and minimize / maximize-restore / close controls
- [x] **Multi-project tabs** in the title bar — open several repositories at once,
      each with an independent session (status, history, branches, diff, view)
- [x] Tab shows project name, a dirty indicator, a per-tab busy spinner and a close button
- [x] `＋` tab returns to the start screen to open another project
- [x] Modern dark theme with a consistent design system
- [x] Toolbar **branch switcher**: shows the current branch name and opens a
      searchable dropdown of local + remote branches for quick switching
- [x] Left navigation rail with live item counts
- [x] Top toolbar with Fetch / Pull / Push / Refresh / Close
- [x] Busy spinner and toast notifications (info / success / error)
- [x] Keyboard shortcuts: `Ctrl/Cmd + R` refresh, `Esc` closes dialogs
- [x] Modal dialogs for create/clone/add flows with validation
- [x] Empty states throughout (no repo, clean tree, no commits, etc.)

## Technical notes

- Backend: `src-tauri/src/git.rs` exposes the full command API; `lib.rs` wires
  plugins and the invoke handler. Commands are **stateless** — each takes the
  target repository path, so multiple repositories can be driven concurrently.
- Frontend: `src/lib/api.ts` (typed IPC wrappers), `src/lib/store.svelte.ts`
  (`RepoSession` per open project + `AppStore` facade/session manager), and
  components under `src/lib/components/`.
- `git2` is built with `default-features = false` — no bundled TLS/SSH is
  required because all network traffic goes through the `git` CLI.

## Not yet implemented (possible next steps)

- [ ] Partial staging (per-hunk / per-line)
- [ ] Amend commit / rebase / cherry-pick / reset
- [ ] Merge conflict resolution UI
- [ ] Blame view and file history
- [ ] Commit signing (GPG/SSH)
- [ ] Multi-repository / recent-repositories list
- [ ] Submodule support
