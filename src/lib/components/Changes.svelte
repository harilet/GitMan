<script lang="ts">
  import type { FileStatus } from "../api";
  import { app } from "../store.svelte";

  let message = $state("");
  let selected = $state<string | null>(null);
  let committing = $state(false);

  async function submitCommit() {
    if (!message.trim() || app.staged.length === 0) return;
    committing = true;
    const ok = await app.commit(message);
    committing = false;
    if (ok) {
      message = "";
      selected = null;
    }
  }

  function select(file: FileStatus, staged: boolean) {
    selected = file.path + (staged ? ":staged" : ":work");
    app.loadWorkingDiff(file.path, staged);
  }

  function codeClass(c: string) {
    return `code-${c === "?" ? "\\?" : c}`;
  }
</script>

<div class="changes">
  <section class="list staged">
    <div class="list-head">
      <h4>Staged ({app.staged.length})</h4>
      <button
        class="btn ghost sm"
        disabled={app.staged.length === 0}
        onclick={() => app.unstageAll()}>Unstage all</button
      >
    </div>
    <div class="files">
      {#each app.staged as file (file.path)}
        <div
          class="file"
          class:selected={selected === file.path + ":staged"}
          role="button"
          tabindex="0"
          onclick={() => select(file, true)}
          onkeydown={(e) => e.key === "Enter" && select(file, true)}
        >
          <span class="file-status-code {codeClass(file.index)}">{file.index}</span>
          <span class="path mono">{file.path}</span>
          <button
            class="btn ghost sm act"
            title="Unstage"
            onclick={(e) => {
              e.stopPropagation();
              app.unstage(file.path);
            }}>−</button
          >
        </div>
      {:else}
        <div class="empty">Nothing staged</div>
      {/each}
    </div>
  </section>

  <section class="commit-box">
    <textarea
      class="textarea"
      placeholder="Commit message…"
      bind:value={message}
      onkeydown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submitCommit();
      }}
    ></textarea>
    <div class="row">
      <button
        class="btn primary"
        disabled={committing || !message.trim() || app.staged.length === 0}
        onclick={submitCommit}
      >
        {committing ? "Committing…" : `Commit ${app.staged.length || ""}`}
      </button>
      <span class="spacer"></span>
      <button
        class="btn"
        disabled={app.unstaged.length === 0}
        onclick={() => app.stageAll()}>Stage all</button
      >
    </div>
    {#if app.user}
      <div class="hint muted">
        Author: {app.user.name || "unset"} &lt;{app.user.email || "unset"}&gt;
      </div>
    {/if}
  </section>

  <section class="list unstaged">
    <div class="list-head">
      <h4>Changes ({app.unstaged.length})</h4>
    </div>
    <div class="files">
      {#each app.unstaged as file (file.path)}
        <div
          class="file"
          class:selected={selected === file.path + ":work"}
          role="button"
          tabindex="0"
          onclick={() => select(file, false)}
          onkeydown={(e) => e.key === "Enter" && select(file, false)}
        >
          <span class="file-status-code {codeClass(file.worktree)}">{file.worktree}</span>
          <span class="path mono">{file.path}</span>
          <div class="actions">
            <button
              class="btn ghost sm act"
              title="Discard changes"
              onclick={(e) => {
                e.stopPropagation();
                if (confirm(`Discard changes in ${file.path}?`)) app.discard(file.path);
              }}>↺</button
            >
            <button
              class="btn ghost sm act"
              title="Stage"
              onclick={(e) => {
                e.stopPropagation();
                app.stage(file.path);
              }}>+</button
            >
          </div>
        </div>
      {:else}
        <div class="empty">Working tree clean</div>
      {/each}
    </div>
  </section>
</div>

<style>
  .changes {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .list {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1 1 0;
    overflow: hidden;
  }
  .list.staged {
    max-height: 34%;
  }
  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
  }
  .list-head h4 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  .files {
    overflow: auto;
    flex: 1;
  }
  .file {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    cursor: pointer;
    border-bottom: 1px solid rgba(48, 54, 61, 0.4);
  }
  .file:hover {
    background: var(--panel);
  }
  .file.selected {
    background: var(--panel-2);
    box-shadow: inset 2px 0 0 var(--accent);
  }
  .path {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .actions {
    display: flex;
    gap: 2px;
  }
  .act {
    opacity: 0;
    font-size: 14px;
    line-height: 1;
  }
  .file:hover .act {
    opacity: 1;
  }
  .empty {
    padding: 14px 12px;
    color: var(--muted);
    font-size: 12px;
  }
  .commit-box {
    padding: 12px;
    background: var(--panel);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 0 0 auto;
  }
  .hint {
    font-size: 11px;
  }
</style>
