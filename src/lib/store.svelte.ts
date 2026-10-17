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

let sessionCounter = 0;

/**
 * A single open repository. Every backend call is scoped to this repository's
 * path, so multiple sessions can be open (and acted upon) independently.
 */
export class RepoSession {
  readonly id: string;
  private app: AppStore;

  readonly path: string;
  repo = $state<RepoInfo | null>(null);
  status = $state<FileStatus[]>([]);
  log = $state<CommitInfo[]>([]);
  branches = $state<BranchInfo[]>([]);
  remotes = $state<RemoteInfo[]>([]);
  tags = $state<TagInfo[]>([]);
  stashes = $state<StashInfo[]>([]);
  user = $state<UserConfig | null>(null);

  view = $state<ViewKey>("changes");
  diff = $state<DiffTarget | null>(null);
  selectedCommit = $state<CommitInfo | null>(null);

  busy = $state(false);

  constructor(app: AppStore, info: RepoInfo) {
    this.app = app;
    this.id = `s${++sessionCounter}`;
    this.path = info.path;
    this.repo = info;
  }

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

  private async run<T>(fn: () => Promise<T>, successMsg?: string): Promise<T | null> {
    this.busy = true;
    try {
      const result = await fn();
      if (successMsg) this.app.notify(successMsg, "success");
      return result;
    } catch (e) {
      this.app.notify(typeof e === "string" ? e : String(e), "error");
      return null;
    } finally {
      this.busy = false;
    }
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
    if (!this.user) {
      this.user = await git.getUserConfig(this.path).catch(() => null);
    }
    this.repo = await git
      .getRepositoryInfo(this.path)
      .catch(() => this.repo);
  }

  async refreshStatus() {
    if (!this.repo) return;
    this.status = await git.getStatus(this.path);
  }

  async refreshLog() {
    if (!this.repo) return;
    this.log = await git.getLog(this.path);
  }

  async refreshBranches() {
    if (!this.repo) return;
    this.branches = await git.listBranches(this.path);
  }

  async refreshRemotes() {
    if (!this.repo) return;
    this.remotes = await git.listRemotes(this.path);
  }

  async refreshTags() {
    if (!this.repo) return;
    this.tags = await git.listTags(this.path);
  }

  async refreshStashes() {
    if (!this.repo) return;
    this.stashes = await git.listStashes(this.path);
  }

  async saveUserConfig(name: string, email: string, global: boolean) {
    const ok = await this.run(
      () => git.setUserConfig(this.path, name, email, global),
      "Git identity saved",
    );
    if (ok !== null) {
      this.user = await git
        .getUserConfig(this.path)
        .catch(() => this.user);
    }
    return ok !== null;
  }

  async loadWorkingDiff(path: string, staged: boolean) {
    const patch = await this.run(() =>
      git.getWorktreeDiff(this.path, path, staged),
    );
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
    const patch = await this.run(() =>
      git.getCommitDiff(this.path, commit.oid),
    );
    if (patch !== null) {
      this.diff = {
        title: commit.summary || commit.short,
        subtitle: `${commit.short} · ${commit.author}`,
        patch,
      };
    }
  }

  async stage(path: string) {
    await this.run(() => git.stageFile(this.path, path));
    await this.refreshStatus();
  }

  async unstage(path: string) {
    await this.run(() => git.unstageFile(this.path, path));
    await this.refreshStatus();
  }

  async stageAll() {
    await this.run(() => git.stageAll(this.path));
    await this.refreshStatus();
  }

  async unstageAll() {
    await this.run(() => git.unstageAll(this.path));
    await this.refreshStatus();
  }

  async discard(path: string) {
    await this.run(
      () => git.discardFile(this.path, path),
      `Discarded changes in ${path}`,
    );
    await this.refreshStatus();
  }

  async commit(message: string, name?: string, email?: string) {
    const oid = await this.run(
      () => git.commit(this.path, message, name, email),
      "Commit created",
    );
    if (oid) {
      await this.refreshAll();
      return true;
    }
    return false;
  }

  async createBranch(name: string, checkout: boolean) {
    const ok = await this.run(
      () => git.createBranch(this.path, name, checkout),
      `Branch ${name} created`,
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async deleteBranch(name: string, force: boolean) {
    const ok = await this.run(
      () => git.deleteBranch(this.path, name, force),
      `Branch ${name} deleted`,
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async checkout(name: string) {
    const ok = await this.run(
      () => git.checkoutBranch(this.path, name),
      `Switched to ${name}`,
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async merge(name: string) {
    const res = await this.run(() => git.mergeBranch(this.path, name));
    if (res !== null) {
      this.app.notify(res || `Merged ${name}`, "success");
      await this.refreshAll();
    }
    return res !== null;
  }

  async addRemote(name: string, url: string) {
    const ok = await this.run(
      () => git.addRemote(this.path, name, url),
      `Remote ${name} added`,
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async removeRemote(name: string) {
    const ok = await this.run(
      () => git.removeRemote(this.path, name),
      `Remote ${name} removed`,
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async fetch(remote: string | null) {
    const res = await this.run(
      () => git.fetch(this.path, remote),
      "Fetch complete",
    );
    if (res !== null) {
      this.app.notify(res || "Fetch complete", "success");
      await this.refreshAll();
    }
  }

  async pull(remote: string | null) {
    const res = await this.run(
      () => git.pull(this.path, remote),
      "Pull complete",
    );
    if (res !== null) {
      this.app.notify(res || "Pull complete", "success");
      await this.refreshAll();
    }
  }

  async push(remote: string | null, branch: string | null, setUpstream: boolean) {
    const res = await this.run(() =>
      git.push(this.path, remote, branch, setUpstream),
    );
    if (res !== null) {
      this.app.notify(res || "Push complete", "success");
      await this.refreshAll();
    }
  }

  async createTag(name: string, message: string | null, target: string | null) {
    const ok = await this.run(
      () => git.createTag(this.path, name, message, target),
      `Tag ${name} created`,
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async deleteTag(name: string) {
    const ok = await this.run(
      () => git.deleteTag(this.path, name),
      `Tag ${name} deleted`,
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async createStash(message: string | null) {
    const ok = await this.run(
      () => git.createStash(this.path, message),
      "Changes stashed",
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async applyStash(index: number) {
    const ok = await this.run(
      () => git.applyStash(this.path, index),
      "Stash applied",
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async popStash(index: number) {
    const ok = await this.run(
      () => git.popStash(this.path, index),
      "Stash popped",
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }

  async dropStash(index: number) {
    const ok = await this.run(
      () => git.dropStash(this.path, index),
      "Stash dropped",
    );
    if (ok !== null) await this.refreshAll();
    return ok !== null;
  }
}

class AppStore {
  sessions = $state<RepoSession[]>([]);
  activeId = $state<string | null>(null);
  recents = $state<RecentProject[]>(sortRecents(loadRecents()));

  toast = $state<{ kind: "info" | "error" | "success"; text: string } | null>(
    null,
  );
  private globalBusy = $state(false);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  get active(): RepoSession | null {
    return this.sessions.find((s) => s.id === this.activeId) ?? null;
  }

  get busy(): boolean {
    return this.globalBusy || this.sessions.some((s) => s.busy);
  }

  // --- Active-session proxies (keep the component API stable) ---

  get repo() {
    return this.active?.repo ?? null;
  }
  get status() {
    return this.active?.status ?? [];
  }
  get staged() {
    return this.active?.staged ?? [];
  }
  get unstaged() {
    return this.active?.unstaged ?? [];
  }
  get log() {
    return this.active?.log ?? [];
  }
  get branches() {
    return this.active?.branches ?? [];
  }
  get localBranches() {
    return this.active?.localBranches ?? [];
  }
  get remoteBranches() {
    return this.active?.remoteBranches ?? [];
  }
  get remotes() {
    return this.active?.remotes ?? [];
  }
  get tags() {
    return this.active?.tags ?? [];
  }
  get stashes() {
    return this.active?.stashes ?? [];
  }
  get user() {
    return this.active?.user ?? null;
  }
  get view(): ViewKey {
    return this.active?.view ?? "changes";
  }
  set view(v: ViewKey) {
    if (this.active) this.active.view = v;
  }
  get diff(): DiffTarget | null {
    return this.active?.diff ?? null;
  }
  set diff(d: DiffTarget | null) {
    if (this.active) this.active.diff = d;
  }
  get selectedCommit() {
    return this.active?.selectedCommit ?? null;
  }

  refreshAll() {
    return this.active?.refreshAll();
  }
  saveUserConfig(name: string, email: string, global: boolean) {
    return this.active?.saveUserConfig(name, email, global);
  }
  loadWorkingDiff(path: string, staged: boolean) {
    return this.active?.loadWorkingDiff(path, staged);
  }
  loadCommit(commit: CommitInfo) {
    return this.active?.loadCommit(commit);
  }
  stage(path: string) {
    return this.active?.stage(path);
  }
  unstage(path: string) {
    return this.active?.unstage(path);
  }
  stageAll() {
    return this.active?.stageAll();
  }
  unstageAll() {
    return this.active?.unstageAll();
  }
  discard(path: string) {
    return this.active?.discard(path);
  }
  commit(message: string) {
    return this.active?.commit(message);
  }
  createBranch(name: string, checkout: boolean) {
    return this.active?.createBranch(name, checkout);
  }
  deleteBranch(name: string, force: boolean) {
    return this.active?.deleteBranch(name, force);
  }
  checkout(name: string) {
    return this.active?.checkout(name);
  }
  merge(name: string) {
    return this.active?.merge(name);
  }
  addRemote(name: string, url: string) {
    return this.active?.addRemote(name, url);
  }
  removeRemote(name: string) {
    return this.active?.removeRemote(name);
  }
  fetch(remote: string | null) {
    return this.active?.fetch(remote);
  }
  pull(remote: string | null) {
    return this.active?.pull(remote);
  }
  push(remote: string | null, branch: string | null, setUpstream: boolean) {
    return this.active?.push(remote, branch, setUpstream);
  }
  createTag(name: string, message: string | null, target: string | null) {
    return this.active?.createTag(name, message, target);
  }
  deleteTag(name: string) {
    return this.active?.deleteTag(name);
  }
  createStash(message: string | null) {
    return this.active?.createStash(message);
  }
  applyStash(index: number) {
    return this.active?.applyStash(index);
  }
  popStash(index: number) {
    return this.active?.popStash(index);
  }
  dropStash(index: number) {
    return this.active?.dropStash(index);
  }

  // --- Session lifecycle ---

  private async runGlobal<T>(fn: () => Promise<T>): Promise<T | null> {
    this.globalBusy = true;
    try {
      return await fn();
    } catch (e) {
      this.notify(typeof e === "string" ? e : String(e), "error");
      return null;
    } finally {
      this.globalBusy = false;
    }
  }

  private async addSession(info: RepoInfo) {
    const existing = this.sessions.find((s) => s.path === info.path);
    if (existing) {
      this.activeId = existing.id;
      await existing.refreshAll();
      this.touchRecent(info.path, info.name);
      this.notify(`Switched to ${info.name}`, "success");
      return;
    }
    const session = new RepoSession(this, info);
    this.sessions = [...this.sessions, session];
    this.activeId = session.id;
    await session.refreshAll();
    this.touchRecent(info.path, info.name);
    this.notify(`Opened ${info.name}`, "success");
  }

  closeSession(id: string) {
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const remaining = this.sessions.filter((s) => s.id !== id);
    if (this.activeId === id) {
      const next = remaining[Math.min(idx, remaining.length - 1)];
      this.activeId = next?.id ?? null;
    }
    this.sessions = remaining;
  }

  closeRepo() {
    if (this.activeId) this.closeSession(this.activeId);
  }

  async openRepo(path: string) {
    const info = await this.runGlobal(() => git.openRepository(path));
    if (info) await this.addSession(info);
  }

  async initRepo(path: string) {
    const info = await this.runGlobal(() => git.initRepository(path));
    if (info) await this.addSession(info);
  }

  async cloneRepo(url: string, destination: string) {
    const info = await this.runGlobal(() =>
      git.cloneRepository(url, destination),
    );
    if (info) await this.addSession(info);
  }

  notify(text: string, kind: "info" | "error" | "success" = "info") {
    this.toast = { kind, text };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = null), 4500);
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
}

export const app = new AppStore();
