<script lang="ts">
  import { open } from "@tauri-apps/plugin-dialog";
  import { app } from "../store.svelte";
  import { autofocus } from "../actions";
  import Modal from "./Modal.svelte";

  let showClone = $state(false);
  let cloneUrl = $state("");
  let cloneDest = $state("");
  let cloning = $state(false);

  async function pickDirectory(): Promise<string | null> {
    const selected = await open({ directory: true, multiple: false });
    return typeof selected === "string" ? selected : null;
  }

  async function openRepo() {
    const dir = await pickDirectory();
    if (dir) await app.openRepo(dir);
  }

  async function initRepo() {
    const dir = await pickDirectory();
    if (dir) await app.initRepo(dir);
  }

  async function pickDestination() {
    const dir = await pickDirectory();
    if (dir) cloneDest = dir;
  }

  async function doClone() {
    if (!cloneUrl.trim() || !cloneDest.trim()) return;
    cloning = true;
    await app.cloneRepo(cloneUrl.trim(), cloneDest.trim());
    cloning = false;
    showClone = false;
    cloneUrl = "";
    cloneDest = "";
  }
</script>

<div class="landing">
  <div class="landing-meta">
    <span class="label">01 / Projects</span>
    <span class="label"
      >{app.recents.length} Recent &middot; Local Repository &middot; Git</span
    >
  </div>

  <div class="landing-body">
    <section class="panel">
      <header class="panel-head">
        <span class="label">02 / Recent</span>
        <span class="label">Resume</span>
      </header>
      <div class="panel-scroll main-scrollbar">
        <h1 class="hero">Pick up where<br /><span class="accent">you left off.</span></h1>

        <div class="recent-list">
          {#each app.recents as r, i (r.path)}
            <div class="recent-row" class:pinned={r.pinned}>
              <button
                class="recent-main"
                onclick={() => app.openRepo(r.path)}
                title={r.path}
              >
                <span class="recent-index">{String(i + 1).padStart(2, "0")}</span>
                <span class="recent-text">
                  <span class="recent-name">{r.name}</span>
                  <span class="recent-path">{r.path}</span>
                </span>
                <span class="recent-arrow">&nearr;</span>
              </button>
              <button
                class="row-action pin"
                class:active={r.pinned}
                title={r.pinned ? "Unpin project" : "Pin project"}
                aria-label={r.pinned ? "Unpin project" : "Pin project"}
                onclick={() => app.togglePin(r.path)}
              >
                {r.pinned ? "★" : "☆"}
              </button>
              <button
                class="row-action"
                title="Remove from recents"
                aria-label="Remove from recents"
                onclick={() => app.removeRecent(r.path)}>✕</button
              >
            </div>
          {:else}
            <div class="empty">No recent projects</div>
          {/each}
        </div>
      </div>
    </section>

    <section class="panel left-border">
      <header class="panel-head">
        <span class="label">03 / New Session</span>
        <span class="label">Open &middot; Init &middot; Clone</span>
      </header>
      <div class="panel-scroll main-scrollbar">
        <h1 class="hero">Start a<br /><span class="accent">new workspace.</span></h1>

        <div class="action-list">
          <button class="action-row" onclick={openRepo}>
            <span class="action-index">01</span>
            <span class="action-text">
              <span class="action-title">Open repository</span>
              <span class="action-sub">Browse an existing local Git project.</span>
            </span>
            <span class="action-arrow">&nearr;</span>
          </button>

          <button class="action-row" onclick={initRepo}>
            <span class="action-index">02</span>
            <span class="action-text">
              <span class="action-title">Initialize</span>
              <span class="action-sub">Create a new repository in a folder.</span>
            </span>
            <span class="action-arrow">&nearr;</span>
          </button>

          <button class="action-row" onclick={() => (showClone = true)}>
            <span class="action-index">03</span>
            <span class="action-text">
              <span class="action-title">Clone</span>
              <span class="action-sub">Fetch a remote repository to disk.</span>
            </span>
            <span class="action-arrow">&nearr;</span>
          </button>
        </div>

        <p class="panel-note label">
          GitWeft keeps every repository in its own session. Open several and
          switch between them from the title bar.
        </p>
      </div>
    </section>
  </div>
</div>

{#if showClone}
  <Modal title="Clone repository" onclose={() => (showClone = false)}>
    <label class="field">
      <span>Remote URL</span>
      <input
        class="input"
        placeholder="https://github.com/user/repo.git"
        bind:value={cloneUrl}
        use:autofocus
      />
    </label>
    <label class="field">
      <span>Destination</span>
      <div class="row">
        <input
          class="input"
          placeholder="/path/to/clone/into"
          bind:value={cloneDest}
        />
        <button class="btn" onclick={pickDestination}>Browse</button>
      </div>
    </label>
    {#snippet footer()}
      <button class="btn" onclick={() => (showClone = false)}>Cancel</button>
      <button
        class="btn primary"
        disabled={cloning || !cloneUrl.trim() || !cloneDest.trim()}
        onclick={doClone}
      >
        {cloning ? "Cloning…" : "Clone"}
      </button>
    {/snippet}
  </Modal>
{/if}

<style>
  .landing {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .landing-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 22px;
    border-bottom: 1px solid var(--border-color);
    flex: 0 0 auto;
  }
  .landing-body {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .panel {
    display: flex;
    flex-direction: column;
    width: 50%;
    min-width: 0;
    height: 100%;
  }
  .panel-scroll {
    padding: 40px 22px;
    flex: 1;
    min-height: 0;
  }
  .hero {
    margin: 0 0 34px 0;
    font-size: clamp(30px, 4.4vw, 58px);
    line-height: 1.02;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-color);
  }

  .recent-list {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--border-color);
  }
  .recent-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--border-color);
    transition: background 0.15s ease;
  }
  .recent-row:hover {
    background: var(--hover-color);
  }
  .recent-row.pinned {
    box-shadow: inset 2px 0 0 var(--yellow);
  }
  .recent-main {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
    padding: 13px 4px 13px 12px;
    border: none;
    background: transparent;
    color: var(--text-color);
    text-align: left;
    cursor: pointer;
    font-family: inherit;
  }
  .recent-index {
    color: var(--primary-color);
    font-size: 11px;
    letter-spacing: 0.1em;
    flex-shrink: 0;
  }
  .recent-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .recent-name {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .recent-path {
    font-size: 11px;
    color: var(--muted-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .recent-arrow {
    color: var(--muted-color);
    flex-shrink: 0;
    padding-right: 10px;
  }
  .recent-row:hover .recent-arrow {
    color: var(--primary-color);
  }
  .row-action {
    border: none;
    border-left: 1px solid var(--border-color);
    background: transparent;
    color: var(--muted-color);
    cursor: pointer;
    width: 38px;
    flex: 0 0 auto;
    font-family: inherit;
    font-size: 13px;
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }
  .row-action:hover {
    background: var(--hover-color);
    color: var(--text-color);
  }
  .row-action.pin.active {
    color: var(--yellow);
  }

  .action-list {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--border-color);
  }
  .action-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 15px 12px 15px 4px;
    border: none;
    border-bottom: 1px solid var(--border-color);
    background: transparent;
    color: var(--text-color);
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition:
      background 0.15s ease,
      padding 0.15s ease;
  }
  .action-row:hover {
    background: var(--hover-color);
    padding-left: 12px;
  }
  .action-index {
    color: var(--primary-color);
    font-size: 11px;
    letter-spacing: 0.1em;
    flex-shrink: 0;
    padding-top: 1px;
  }
  .action-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }
  .action-title {
    font-size: 13px;
    font-weight: 600;
  }
  .action-sub {
    font-size: 11px;
    color: var(--muted-color);
  }
  .action-arrow {
    color: var(--muted-color);
    flex-shrink: 0;
  }
  .action-row:hover .action-arrow {
    color: var(--primary-color);
  }
  .panel-note {
    margin-top: 24px;
    line-height: 1.8;
    white-space: normal;
    max-width: 44ch;
  }
</style>
