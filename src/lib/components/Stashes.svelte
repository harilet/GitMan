<script lang="ts">
  import { app } from "../store.svelte";

  let message = $state("");

  async function create() {
    const ok = await app.createStash(message.trim() || null);
    if (ok) message = "";
  }
</script>

<div class="stashes">
  <div class="head">
    <h4>Stashes</h4>
    <span class="muted">{app.stashes.length} saved</span>
  </div>
  <div class="create">
    <input
      class="input"
      placeholder="Stash message (optional)"
      bind:value={message}
      onkeydown={(e) => e.key === "Enter" && create()}
    />
    <button class="btn primary sm" onclick={create}>Stash changes</button>
  </div>
  <div class="content">
    {#each app.stashes as stash (stash.oid)}
      <div class="stash">
        <div class="info">
          <span class="badge blue">stash #{stash.index}</span>
          <span class="msg">{stash.message || "(no message)"}</span>
        </div>
        <div class="actions">
          <button class="btn sm" onclick={() => app.applyStash(stash.index)}>Apply</button>
          <button class="btn sm" onclick={() => app.popStash(stash.index)}>Pop</button>
          <button
            class="btn danger sm"
            onclick={() => {
              if (confirm(`Drop stash #${stash.index}?`)) app.dropStash(stash.index);
            }}>Drop</button
          >
        </div>
      </div>
    {:else}
      <div class="empty">No stashes</div>
    {/each}
  </div>
</div>

<style>
  .stashes {
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
  .create {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    flex: 0 0 auto;
  }
  .content {
    overflow: auto;
    flex: 1;
  }
  .stash {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(48, 54, 61, 0.5);
  }
  .stash:hover {
    background: var(--panel);
  }
  .info {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .msg {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .actions {
    display: flex;
    gap: 4px;
    flex: 0 0 auto;
  }
  .empty {
    padding: 16px 12px;
    color: var(--muted);
  }
</style>
