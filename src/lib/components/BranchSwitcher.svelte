<script lang="ts">
  import { app } from "../store.svelte";
  import { autofocus } from "../actions";

  let open = $state(false);
  let filter = $state("");

  const locals = $derived(app.localBranches.filter(match));
  const remotes = $derived(app.remoteBranches.filter(match));
  const current = $derived(app.repo?.branch);

  function match(b: { name: string }) {
    const f = filter.trim().toLowerCase();
    return !f || b.name.toLowerCase().includes(f);
  }

  function toggle() {
    open = !open;
    if (open) filter = "";
  }

  async function pick(name: string) {
    open = false;
    if (name === current) return;
    await app.checkout(name);
  }
</script>

<div class="switcher">
  <button
    class="chip"
    class:open
    onclick={toggle}
    title="{app.repo?.path} — click to switch branch"
  >
    <span class="dot" class:dirty={app.repo?.dirty}></span>
    <span class="name">{current}</span>
    <span class="caret">▾</span>
  </button>

  {#if open}
    <div class="backdrop" onclick={() => (open = false)} role="presentation"></div>
    <div class="menu">
      <div class="filter">
        <input
          class="input"
          placeholder="Switch branch…"
          bind:value={filter}
          use:autofocus
        />
      </div>
      <div class="list">
        {#each locals as b (b.name)}
          <button class="item" class:current={b.isHead} onclick={() => pick(b.name)}>
            <span class="check">{b.isHead ? "✓" : ""}</span>
            <span class="bname">{b.name}</span>
            {#if b.upstream}<span class="up">→ {b.upstream}</span>{/if}
          </button>
        {/each}

        {#if remotes.length}
          <div class="divider">Remote branches</div>
          {#each remotes as b (b.name)}
            <button class="item" onclick={() => pick(b.name)}>
              <span class="check"></span>
              <span class="bname">{b.name}</span>
            </button>
          {/each}
        {/if}

        {#if locals.length === 0 && remotes.length === 0}
          <div class="empty">No branches yet</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .switcher {
    position: relative;
    display: inline-flex;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 12px;
    background: var(--panel-3);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 12px;
    cursor: pointer;
  }
  .chip:hover,
  .chip.open {
    border-color: var(--accent);
    background: var(--panel-2);
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green);
  }
  .dot.dirty {
    background: var(--yellow);
  }
  .caret {
    font-size: 9px;
    color: var(--muted);
  }
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
  }
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 50;
    width: 300px;
    max-height: 380px;
    display: flex;
    flex-direction: column;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
    overflow: hidden;
  }
  .filter {
    padding: 8px;
    border-bottom: 1px solid var(--border);
    flex: 0 0 auto;
  }
  .list {
    overflow: auto;
    padding: 4px;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    background: transparent;
    border-radius: 6px;
    color: var(--text);
    cursor: pointer;
    text-align: left;
    font-size: 12px;
  }
  .item:hover {
    background: var(--panel-3);
  }
  .item.current {
    box-shadow: inset 2px 0 0 var(--green);
  }
  .check {
    width: 14px;
    color: var(--green);
    flex: 0 0 auto;
  }
  .bname {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .up {
    font-size: 10px;
    color: var(--muted);
  }
  .divider {
    padding: 8px 8px 4px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .empty {
    padding: 12px;
    color: var(--muted);
    font-size: 12px;
  }
</style>
