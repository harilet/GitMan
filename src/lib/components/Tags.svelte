<script lang="ts">
  import { confirm } from "@tauri-apps/plugin-dialog";
  import { app } from "../store.svelte";
  import { autofocus } from "../actions";
  import Modal from "./Modal.svelte";

  let showCreate = $state(false);
  let tagName = $state("");
  let tagMessage = $state("");
  let tagTarget = $state("");

  async function create() {
    if (!tagName.trim()) return;
    const target =
      tagTarget.trim() ||
      app.log[0]?.oid ||
      null;
    const ok = await app.createTag(
      tagName.trim(),
      tagMessage.trim() || null,
      target,
    );
    if (ok) {
      showCreate = false;
      tagName = "";
      tagMessage = "";
      tagTarget = "";
    }
  }
</script>

<div class="tags">
  <div class="head">
    <h4>Tags</h4>
    <button class="btn primary sm" onclick={() => (showCreate = true)}>+ New tag</button>
  </div>
  <div class="content">
    {#each app.tags as tag (tag.name)}
      <div class="tag">
        <div class="top">
          <div class="info">
            <span class="name mono">{tag.name}</span>
            <span class="badge {tag.annotated ? 'yellow' : ''}">
              {tag.annotated ? "annotated" : "lightweight"}
            </span>
            <span class="mono muted target">{tag.target.slice(0, 7)}</span>
          </div>
          <div class="actions">
            <button
              class="btn danger sm"
              onclick={async () => {
                if (await confirm(`Delete tag "${tag.name}"?`)) app.deleteTag(tag.name);
              }}>Delete</button
            >
          </div>
        </div>
        {#if tag.message}
          <div class="msg muted">{tag.message}</div>
        {/if}
      </div>
    {:else}
      <div class="empty">No tags</div>
    {/each}
  </div>
</div>

{#if showCreate}
  <Modal title="Create tag" onclose={() => (showCreate = false)}>
    <label class="field">
      <span>Tag name</span>
      <input class="input" placeholder="v1.0.0" bind:value={tagName} use:autofocus />
    </label>
    <label class="field">
      <span>Message (optional — creates an annotated tag)</span>
      <textarea class="textarea" bind:value={tagMessage}></textarea>
    </label>
    <label class="field">
      <span>Target commit (optional, default HEAD)</span>
      <input class="input mono" placeholder="SHA or ref" bind:value={tagTarget} />
    </label>
    {#snippet footer()}
      <button class="btn" onclick={() => (showCreate = false)}>Cancel</button>
      <button class="btn primary" disabled={!tagName.trim()} onclick={create}>Create</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .tags {
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
  .tag {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(48, 54, 61, 0.5);
  }
  .tag:hover {
    background: var(--panel);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  .name {
    font-weight: 600;
  }
  .target {
    font-size: 11px;
  }
  .msg {
    flex-basis: 100%;
    font-size: 12px;
  }
  .empty {
    padding: 16px 12px;
    color: var(--muted);
  }
</style>
