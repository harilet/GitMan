<script lang="ts">
  import { app } from "../store.svelte";
  import { autofocus } from "../actions";
  import Modal from "./Modal.svelte";

  let showAdd = $state(false);
  let remoteName = $state("origin");
  let remoteUrl = $state("");

  const currentBranch = $derived(app.branches.find((b) => b.isHead));
  const hasUpstream = $derived(!!currentBranch?.upstream);

  async function add() {
    if (!remoteName.trim() || !remoteUrl.trim()) return;
    const ok = await app.addRemote(remoteName.trim(), remoteUrl.trim());
    if (ok) {
      showAdd = false;
      remoteUrl = "";
    }
  }
</script>

<div class="remotes">
  <div class="head">
    <h4>Remotes</h4>
    <button class="btn primary sm" onclick={() => (showAdd = true)}>+ Add remote</button>
  </div>
  <div class="content">
    {#each app.remotes as remote (remote.name)}
      <div class="remote">
        <div class="info">
          <span class="name">{remote.name}</span>
          <span class="muted mono url">{remote.url}</span>
        </div>
        <div class="actions">
          <button class="btn sm" onclick={() => app.fetch(remote.name)}>Fetch</button>
          <button class="btn sm" onclick={() => app.pull(remote.name)}>Pull</button>
          <button
            class="btn sm"
            onclick={() =>
              app.push(
                remote.name,
                currentBranch?.name ?? null,
                !hasUpstream,
              )}>Push</button
          >
          <button
            class="btn danger sm"
            onclick={() => {
              if (confirm(`Remove remote "${remote.name}"?`))
                app.removeRemote(remote.name);
            }}>Remove</button
          >
        </div>
      </div>
    {:else}
      <div class="empty">No remotes configured</div>
    {/each}

    {#if currentBranch}
      <div class="current">
        <span class="muted">Current branch</span>
        <span class="mono">{currentBranch.name}</span>
        {#if hasUpstream}
          <span class="badge green">tracking {currentBranch.upstream}</span>
        {:else}
          <span class="badge yellow">no upstream</span>
        {/if}
      </div>
    {/if}
  </div>
</div>

{#if showAdd}
  <Modal title="Add remote" onclose={() => (showAdd = false)}>
    <label class="field">
      <span>Name</span>
      <input class="input" bind:value={remoteName} use:autofocus />
    </label>
    <label class="field">
      <span>URL</span>
      <input class="input" placeholder="git@github.com:user/repo.git" bind:value={remoteUrl} />
    </label>
    {#snippet footer()}
      <button class="btn" onclick={() => (showAdd = false)}>Cancel</button>
      <button
        class="btn primary"
        disabled={!remoteName.trim() || !remoteUrl.trim()}
        onclick={add}>Add</button
      >
    {/snippet}
  </Modal>
{/if}

<style>
  .remotes {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex: 0 0 auto;
  }
  .head h4 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  .content {
    overflow: auto;
    flex: 1;
  }
  .remote {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(48, 54, 61, 0.5);
  }
  .info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }
  .name {
    font-weight: 600;
  }
  .url {
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .actions {
    display: flex;
    gap: 4px;
    flex: 0 0 auto;
  }
  .current {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 12px;
    font-size: 12px;
  }
  .empty {
    padding: 16px 12px;
    color: var(--muted);
  }
</style>
