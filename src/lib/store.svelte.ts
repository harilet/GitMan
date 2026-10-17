import {
  git,
  type BranchInfo,
  type CommitInfo,
  type FileStatus,
  type RemoteInfo,
  type RepoInfo,
  type StashInfo,
  type TagInfo,
  type UserConfig,
} from "./api";
import {
  loadRecents,
  persistRecents,
  sortRecents,
  type RecentProject,
} from "./recents";

export type ViewKey =
  | "changes"
  | "history"
  | "branches"
  | "remotes"
  | "tags"
  | "stashes";

export interface DiffTarget {
  title: string;
  subtitle: string;
  patch: string;
}

class AppStore {
  repo = $state<RepoInfo | null>(null);
  status = $state<FileStatus[]>([]);
  log = $state<CommitInfo[]>([]);
  branches = $state<BranchInfo[]>([]);
  remotes = $state<RemoteInfo[]>([]);
  tags = $state<TagInfo[]>([]);
  stashes = $state<StashInfo[]>([]);
  user = $state<UserConfig | null>(null);
  recents = $state<RecentProject[]>(sortRecents(loadRecents()));

  view = $state<ViewKey>("changes");
  diff = $state<DiffTarget | null>(null);
  selectedCommit = $state<CommitInfo | null>(null);

  busy = $state(false);
  toast = $state<{ kind: "info" | "error" | "success"; text: string } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  get staged(): FileStatus[] {
    return this.status.filter((f) => f.staged);
  }

  get unstaged(): FileStatus[] {
    return this.status.filter((f) => f.unstaged);
  }

  get localBranches(): BranchInfo[] {
    return this.branches.filter((b) => !b.isRemote);
  }

  get remoteBranches(): BranchInfo[] {
    return this.branches.filter((b) => b.isRemote);
  }

  notify(text: string, kind: "info" | "error" | "success" = "info") {
    this.toast = { kind, text };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), 4500);
  }

  private async run<T>(fn: () => Promise<T>, successMsg?: string): Promise<T | null> {
    this.busy = true;
    try {
      const result = await fn();
      if (successMsg) this.notify(successMsg, "success");
      return result;
    } catch (e) {
      this.notify(typeof e === "string" ? e : String(e), "error");
      return null;
    } finally {
      this.busy = false;
    }
  }

  private touchRecent(path: string, name: string) {
    const existing = this.recents.find((r) => r.path === path);
    const entry: RecentProject = {
      path,
      name,
      pinned: existing?.pinned ?? false,
      lastOpened: Date.now(),
    };
    const next = this.recents.filter((r) => r.path !== path);
    next.push(entry);
    this.recents = sortRecents(next).slice(0, 30);
    persistRecents(this.recents);
  }

  togglePin(path: string) {
    this.recents = sortRecents(
      this.recents.map((r) => (r.path === path ? { ...r, pinned: !r.pinned } : r)),
    );
    persistRecents(this.recents);
  }

  removeRecent(path: string) {
    this.recents = this.recents.filter((r) => r.path !== path);
    persistRecents(this.recents);
  }

  async openRepo(path: string) {
    const info = await this.run(() => git.openRepository(path));
    if (info) {
      this.repo = info;
      this.view = "changes";
      await this.refreshAll();
      this.touchRecent(info.path, info.name);
      this.notify(`Opened ${info.name}`, "success");
    }
  }

  async initRepo(path: string) {
    const info = await this.run(() => git.initRepository(path));
    if (info) {
      this.repo = info;
      this.view = "changes";
      await this.refreshAll();
      this.touchRecent(info.path, info.name);
      this.notify(`Initialized repository at ${info.path}`, "success");
    }
  }

  async cloneRepo(url: string, destination: string) {
    const info = await this.run(() => git.cloneRepository(url, destination));
    if (info) {
      this.repo = info;
      this.view = "changes";
      await this.refreshAll();
      this.touchRecent(info.path, info.name);
      this.notify(`Cloned into ${info.path}`, "success");
    }
  }

  async closeRepo() {
    await git.closeRepository();
    this.repo = null;
    this.status = [];
    this.log = [];
    this.branches = [];
    this.remotes = [];
    this.tags = [];
    this.stashes = [];
    this.diff = null;
    this.selectedCommit = null;
  }

  async refreshAll() {
    if (!this.repo) return;
    await Promise.all([
      this.refreshStatus(),
      this.refreshLog(),
      this.refreshBranches(),
      this.refreshRemotes(),
      this.refreshTags(),
      this.refreshStashes(),
    ]);
    if (!this.user) this.user = await git.getUserConfig().catch(() => null);
    this.repo = await git.getRepositoryInfo().catch(() => this.repo);
  }

  async refreshStatus() {
    if (!this.repo) return;
    this.status = await git.getStatus();
  }

  async refreshLog() {
    if (!this.repo) return;
    this.log = await git.getLog();
  }

  async saveUserConfig(name: string, email: string, global: boolean) {
    const ok = await this.run(
      () => git.setUserConfig(name, email, global),
      "Git identity saved",
    );
    if (ok !== null) {
      this.user = await git.getUserConfig().catch(() => this.user);
    }
    return ok !== null;
  }

  async refreshBranches() {
    if (!this.repo) return;
    this.branches = await git.listBranches();
  }

  async refreshRemotes() {
    if (!this.repo) return;
    this.remotes = await git.listRemotes();
  }

  async refreshTags() {
    if (!this.repo) return;
    this.tags = await git.listTags();
  }

  async refreshStashes() {
    if (!this.repo) return;
    this.stashes = await git.listStashes();
  }

  async loadWorkingDiff(path: string, staged: boolean) {
    const patch = await this.run(() => git.getWorktreeDiff(path, staged));
    if (patch !== null) {
      this.diff = {
        title: path,
        subtitle: staged ? "Staged changes" : "Working tree changes",
        patch,
      };
    }
  }

  async loadCommit(commit: CommitInfo) {
    this.selectedCommit = commit;
    const patch = await this.run(() => git.getCommitDiff(commit.oid));
    if (patch !== null) {
      this.diff = {
        title: commit.summary || commit.short,
        subtitle: `${commit.short} · ${commit.author}`,
        patch,
      };
    }
  }

  async stage(path: string) {
    await this.run(() => git.stageFile(path));
    await this.refreshStatus();
  }

  async unstage(path: string) {
    await this.run(() => git.unstageFile(path));
    await this.refreshStatus();
  }

  async stageAll() {
    await this.run(() => git.stageAll());
    await this.refreshStatus();
  }

  async unstageAll() {
    await this.run(() => git.unstageAll());
    await this.refreshStatus();
  }

  async discard(path: string) {
    await this.run(() => git.discardFile(path), `Discarded changes in ${path}`);
    await this.refreshStatus();
  }

  async commit(message: string, name?: string, email?: string) {
    const oid = await this.run(() => git.commit(message, name, email), "Commit created");
    if (oid) {
      await this.refreshAll();
      return true;
    }
    return false;
  }

  async createBranch(name: string, checkout: boolean) {
    const ok = await this.run(
      () => git.createBranch(name, checkout),
      `Branch ${name} created`,
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async deleteBranch(name: string, force: boolean) {
    const ok = await this.run(
      () => git.deleteBranch(name, force),
      `Branch ${name} deleted`,
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async checkout(name: string) {
    const ok = await this.run(() => git.checkoutBranch(name), `Switched to ${name}`);
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async merge(name: string) {
    const res = await this.run(() => git.mergeBranch(name));
    if (res !== null) {
      this.notify(res || `Merged ${name}`, "success");
      await this.refreshAll();
    }
    return res !== null;
  }

  async addRemote(name: string, url: string) {
    const ok = await this.run(() => git.addRemote(name, url), `Remote ${name} added`);
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async removeRemote(name: string) {
    const ok = await this.run(() => git.removeRemote(name), `Remote ${name} removed`);
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async fetch(remote: string | null) {
    const res = await this.run(() => git.fetch(remote), "Fetch complete");
    if (res !== null) {
      this.notify(res || "Fetch complete", "success");
      await this.refreshAll();
    }
  }

  async pull(remote: string | null) {
    const res = await this.run(() => git.pull(remote), "Pull complete");
    if (res !== null) {
      this.notify(res || "Pull complete", "success");
      await this.refreshAll();
    }
  }

  async push(remote: string | null, branch: string | null, setUpstream: boolean) {
    const res = await this.run(() => git.push(remote, branch, setUpstream));
    if (res !== null) {
      this.notify(res || "Push complete", "success");
      await this.refreshAll();
    }
  }

  async createTag(name: string, message: string | null, target: string | null) {
    const ok = await this.run(() => git.createTag(name, message, target), `Tag ${name} created`);
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async deleteTag(name: string) {
    const ok = await this.run(() => git.deleteTag(name), `Tag ${name} deleted`);
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async createStash(message: string | null) {    const ok = await this.run(() => git.createStash(message), "Changes stashed");
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async applyStash(index: number) {
    const ok = await this.run(() => git.applyStash(index), "Stash applied");
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async popStash(index: number) {
    const ok = await this.run(() => git.popStash(index), "Stash popped");
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async dropStash(index: number) {
    const ok = await this.run(() => git.dropStash(index), "Stash dropped");
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }
}

export const app = new AppStore();
