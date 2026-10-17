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
  <div class="hero">
    <div class="logo">⎇</div>
    <h1>Git GUI</h1>
    <p class="muted">Browse, review and manage your local and remote Git repositories.</p>
  </div>

  <div class="cards">
    <button class="card" onclick={openRepo}>
      <span class="ico">📂</span>
      <span class="t">Open Repository</span>
      <span class="d">Browse an existing repository on disk</span>
    </button>
    <button class="card" onclick={initRepo}>
      <span class="ico">✨</span>
      <span class="t">Initialize Repository</span>
      <span class="d">Create a new Git repository</span>
    </button>
    <button class="card" onclick={() => (showClone = true)}>
      <span class="ico">☁</span>
      <span class="t">Clone Repository</span>
      <span class="d">Clone a remote repository over the network</span>
    </button>
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 40px;
    padding: 24px;
  }
  .hero {
    text-align: center;
  }
  .logo {
    font-size: 52px;
    color: var(--accent);
    line-height: 1;
    margin-bottom: 12px;
  }
  h1 {
    font-size: 24px;
    margin-bottom: 8px;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    width: min(760px, 92vw);
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 20px;
    text-align: left;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--text);
    cursor: pointer;
    transition:
      border-color 0.15s,
      transform 0.15s,
      background 0.15s;
  }
  .card:hover {
    border-color: var(--accent);
    background: var(--panel-2);
    transform: translateY(-2px);
  }
  .ico {
    font-size: 22px;
  }
  .t {
    font-weight: 600;
    font-size: 14px;
  }
  .d {
    font-size: 12px;
    color: var(--muted);
  }
</style>
