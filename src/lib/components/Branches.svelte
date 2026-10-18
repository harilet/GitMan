<script lang="ts">
  import { app } from "../store.svelte";
  import { autofocus } from "../actions";
  import Modal from "./Modal.svelte";

  let showCreate = $state(false);
  let newName = $state("");
  let checkoutAfter = $state(true);

  async function create() {
    if (!newName.trim()) return;
    const ok = await app.createBranch(newName.trim(), checkoutAfter);
    if (ok) {
      showCreate = false;
      newName = "";
    }
  }

  async function remove(name: string, merged: boolean) {
    if (
      !merged &&
      !confirm(
        `Branch "${name}" has unmerged commits. Force delete it? Unmerged commits will be lost.`,
      )
    )
      return;
    if (!confirm(`Delete branch "${name}"?`)) return;
    await app.deleteBranch(name, !merged);
  }
</script>

<div class="branches">
  <div class="head">
    <h4>Branches</h4>
    <button class="btn primary sm" onclick={() => (showCreate = true)}>
      + New branch
    </button>
  </div>
  <div class="content">
    <div class="section-title">Local</div>
    {#each app.localBranches as b (b.name)}
      <div class="branch" class:current={b.isHead}>
        <div class="info">
          <span class="name">
            {#if app.repo?.branch === b.name}✓{/if}
            {b.name}
          </span>
          {#if b.upstream}
            <span class="muted up">→ {b.upstream}</span>
            {#if b.ahead}
              <span
                class="badge blue"
                title="{b.ahead} commit(s) ahead of {b.upstream}"
                >↑{b.ahead}</span
              >
            {/if}
            {#if b.behind}
              <span
                class="badge yellow"
                title="{b.behind} commit(s) behind {b.upstream}"
                >↓{b.behind}</span
              >
            {/if}
          {/if}
        </div>
        <div class="actions">
          {#if !b.isHead}
            <button class="btn sm" onclick={() => app.checkout(b.name)}>Checkout</button>
            <button class="btn sm" onclick={() => app.merge(b.name)}>Merge</button>
            <button class="btn danger sm" onclick={() => remove(b.name, b.merged)}>Delete</button>
          {:else}
            <span class="badge green">current</span>
          {/if}
        </div>
      </div>
    {:else}
      <div class="empty">No local branches</div>
    {/each}

    {#if app.remoteBranches.length}
      <div class="section-title">Remote</div>
      {#each app.remoteBranches as b (b.name)}
        <div class="branch">
          <div class="info">
            <span class="name">{b.name}</span>
            <span class="badge purple">remote</span>
          </div>
          <div class="actions">
            <button class="btn sm" onclick={() => app.checkout(b.name)}>
              Checkout
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

{#if showCreate}
  <Modal title="Create branch" onclose={() => (showCreate = false)}>
    <label class="field">
      <span>Branch name</span>
      <input
        class="input"
        placeholder="feature/my-branch"
        bind:value={newName}
        use:autofocus
      />
    </label>
    <label class="row" style="gap:6px">
      <input type="checkbox" bind:checked={checkoutAfter} />
      <span>Checkout after creating</span>
    </label>
    {#snippet footer()}
      <button class="btn" onclick={() => (showCreate = false)}>Cancel</button>
      <button class="btn primary" disabled={!newName.trim()} onclick={create}>
        Create
      </button>
    {/snippet}
  </Modal>
{/if}

<style>
  .branches {
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
  .section-title {
    padding: 8px 12px 4px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .branch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 12px;
    border-bottom: 1px solid rgba(48, 54, 61, 0.4);
  }
  .branch:hover {
    background: var(--panel);
  }
  .branch.current {
    background: var(--panel-2);
    box-shadow: inset 2px 0 0 var(--green);
  }
  .info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .up {
    font-size: 11px;
  }
  .actions {
    display: flex;
    gap: 4px;
    flex: 0 0 auto;
  }
  .empty {
    padding: 12px;
    color: var(--muted);
    font-size: 12px;
  }
</style>
