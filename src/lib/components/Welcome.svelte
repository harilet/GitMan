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

<div class="welcome">
  <div class="panel">
    <div class="hero">
      <div class="logo">⎇</div>
      <h1>Git GUI</h1>
      <p class="muted">
        Browse, review and manage your local and remote Git repositories.
      </p>
    </div>

    <div class="actions">
      <button class="action" onclick={openRepo}>
        <span class="ico">📂</span><span>Open repository</span>
      </button>
      <button class="action" onclick={initRepo}>
        <span class="ico">✨</span><span>Initialize</span>
      </button>
      <button class="action" onclick={() => (showClone = true)}>
        <span class="ico">☁</span><span>Clone</span>
      </button>
    </div>

    <div class="recents">
      <div class="recents-head">
        <h2>Recent projects</h2>
        {#if app.recents.length}<span class="muted">{app.recents.length}</span>{/if}
      </div>
      {#if app.recents.length === 0}
        <div class="empty muted">
          No recent projects yet. Open or clone a repository to see it here.
        </div>
      {:else}
        {#each app.recents as r (r.path)}
          <div class="recent" class:pinned={r.pinned}>
            <button class="open" onclick={() => app.openRepo(r.path)} title={r.path}>
              <span class="rname">{r.name}</span>
              <span class="rpath muted">{r.path}</span>
            </button>
            <button
              class="icon-btn"
              class:active={r.pinned}
              title={r.pinned ? "Unpin project" : "Pin project"}
              onclick={() => app.togglePin(r.path)}
            >
              {r.pinned ? "★" : "☆"}
            </button>
            <button
              class="icon-btn"
              title="Remove from recents"
              onclick={() => app.removeRecent(r.path)}>✕</button
            >
          </div>
        {/each}
      {/if}
    </div>
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
        <button class="btn" onclick={pickDestination}>Browse…</button>
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
  .welcome {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 48px 24px;
    overflow: auto;
  }
  .panel {
    width: min(680px, 94vw);
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .hero {
    text-align: center;
  }
  .logo {
    font-size: 48px;
    color: var(--accent);
    line-height: 1;
    margin-bottom: 10px;
  }
  h1 {
    font-size: 24px;
    margin-bottom: 6px;
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition:
      border-color 0.15s,
      background 0.15s,
      transform 0.15s;
  }
  .action:hover {
    border-color: var(--accent);
    background: var(--panel-2);
    transform: translateY(-1px);
  }
  .ico {
    font-size: 16px;
  }

  .recents {
    border-top: 1px solid var(--border);
    padding-top: 18px;
  }
  .recents-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .recents-head h2 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .empty {
    padding: 18px;
    text-align: center;
    border: 1px dashed var(--border);
    border-radius: 10px;
    font-size: 12px;
  }
  .recent {
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--panel);
    margin-bottom: 8px;
    padding: 4px 6px 4px 0;
  }
  .recent:hover {
    border-color: #484f58;
    background: var(--panel-2);
  }
  .recent.pinned {
    border-color: #4a3a12;
    box-shadow: inset 3px 0 0 var(--yellow);
  }
  .open {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: var(--text);
    cursor: pointer;
    text-align: left;
  }
  .rname {
    font-weight: 600;
    font-size: 13px;
  }
  .rpath {
    font-size: 11px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .icon-btn {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 14px;
  }
  .icon-btn:hover {
    background: var(--panel-3);
    color: var(--text);
  }
  .icon-btn.active {
    color: var(--yellow);
  }
</style>
