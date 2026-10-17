import { invoke } from "@tauri-apps/api/core";

export interface RepoInfo {
  path: string;
  name: string;
  branch: string;
  head: string;
  detached: boolean;
  unborn: boolean;
  dirty: boolean;
}

export interface FileStatus {
  path: string;
  index: string;
  worktree: string;
  staged: boolean;
  unstaged: boolean;
}

export interface CommitInfo {
  oid: string;
  short: string;
  summary: string;
  message: string;
  author: string;
  email: string;
  time: number;
  parents: string[];
}

export interface BranchInfo {
  name: string;
  isHead: boolean;
  isRemote: boolean;
  upstream: string | null;
  target: string | null;
}

export interface RemoteInfo {
  name: string;
  url: string;
}

export interface TagInfo {
  name: string;
  target: string;
  message: string;
  annotated: boolean;
}

export interface StashInfo {
  index: number;
  message: string;
  oid: string;
}

export interface UserConfig {
  name: string;
  email: string;
}

export const git = {
  openRepository: (path: string) => invoke<RepoInfo>("open_repository", { path }),
  initRepository: (path: string) => invoke<RepoInfo>("init_repository", { path }),
  closeRepository: () => invoke<void>("close_repository"),
  getRepositoryInfo: () => invoke<RepoInfo>("get_repository_info"),
  cloneRepository: (url: string, destination: string) =>
    invoke<RepoInfo>("clone_repository", { url, destination }),

  getStatus: () => invoke<FileStatus[]>("get_status"),
  stageFile: (path: string) => invoke<void>("stage_file", { path }),
  unstageFile: (path: string) => invoke<void>("unstage_file", { path }),
  stageAll: () => invoke<void>("stage_all"),
  unstageAll: () => invoke<void>("unstage_all"),
  discardFile: (path: string) => invoke<void>("discard_file", { path }),
  commit: (message: string, authorName?: string, authorEmail?: string) =>
    invoke<string>("commit", { message, authorName, authorEmail }),

  getLog: (limit = 300) => invoke<CommitInfo[]>("get_log", { limit }),
  getWorktreeDiff: (path: string | null, staged: boolean) =>
    invoke<string>("get_worktree_diff", { path, staged }),
  getCommitDiff: (oid: string) => invoke<string>("get_commit_diff", { oid }),

  listBranches: () => invoke<BranchInfo[]>("list_branches"),
  createBranch: (name: string, checkout: boolean) =>
    invoke<void>("create_branch", { name, checkout }),
  deleteBranch: (name: string, force: boolean) =>
    invoke<void>("delete_branch", { name, force }),
  checkoutBranch: (name: string) => invoke<void>("checkout_branch", { name }),
  mergeBranch: (name: string) => invoke<string>("merge_branch", { name }),

  listRemotes: () => invoke<RemoteInfo[]>("list_remotes"),
  addRemote: (name: string, url: string) => invoke<void>("add_remote", { name, url }),
  removeRemote: (name: string) => invoke<void>("remove_remote", { name }),
  fetch: (remote: string | null) => invoke<string>("fetch", { remote }),
  pull: (remote: string | null) => invoke<string>("pull", { remote }),
  push: (remote: string | null, branch: string | null, setUpstream: boolean) =>
    invoke<string>("push", { remote, branch, setUpstream }),

  listTags: () => invoke<TagInfo[]>("list_tags"),
  createTag: (name: string, message: string | null, target: string | null) =>
    invoke<void>("create_tag", { name, message, target }),
  deleteTag: (name: string) => invoke<void>("delete_tag", { name }),

  listStashes: () => invoke<StashInfo[]>("list_stashes"),
  createStash: (message: string | null) => invoke<string>("create_stash", { message }),
  applyStash: (index: number) => invoke<void>("apply_stash", { index }),
  popStash: (index: number) => invoke<void>("pop_stash", { index }),
  dropStash: (index: number) => invoke<void>("drop_stash", { index }),

  getUserConfig: () => invoke<UserConfig>("get_user_config"),
  setUserConfig: (name: string, email: string, global: boolean) =>
    invoke<void>("set_user_config", { name, email, global }),
};
