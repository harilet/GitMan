<script lang="ts">
  import { parsePatch, type DiffLine } from "../format";

  let { patch, empty }: { patch: string; empty?: string } = $props();

  const files = $derived(parsePatch(patch));

  function marker(line: DiffLine): string {
    if (line.type === "add") return "+";
    if (line.type === "del") return "-";
    return " ";
  }
</script>

<div class="diff">
  {#if files.length === 0}
    <div class="empty">{empty ?? "No changes to display"}</div>
  {:else}
    <div class="inner">
      {#each files as file, fi (fi)}
        {#if file.header}
          <div class="file-header">
            <span class="tag">F</span>
            <span class="path">{file.header}</span>
          </div>
        {/if}
        {#each file.lines as line, li (li)}
          {#if line.type === "hunk"}
            <div class="row hunk">
              <span class="tag">H</span>
              <span class="code">{line.content}</span>
            </div>
          {:else if line.type === "meta"}
            <div class="row meta">
              <span class="code">{line.content}</span>
            </div>
          {:else if line.type === "none"}
            <div class="row none"></div>
          {:else}
            <div class="row {line.type}">
              <span class="marker">{marker(line)}</span>
              <span class="num old">{line.oldNo ?? ""}</span>
              <span class="num new">{line.newNo ?? ""}</span>
              <span class="code">{line.content}</span>
            </div>
          {/if}
        {/each}
      {/each}
    </div>
  {/if}
</div>

<style>
  .diff {
    height: 100%;
    overflow: auto;
    background: var(--bg);
  }
  .empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--muted);
  }
  .inner {
    display: inline-block;
    min-width: 100%;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 12px;
    line-height: 1.6;
  }
  .row {
    display: flex;
    align-items: stretch;
    min-height: 1.6em;
  }
  .row .code {
    flex: 1;
    white-space: pre;
    padding: 1px 16px 1px 4px;
  }
  .marker {
    flex: 0 0 auto;
    width: 18px;
    text-align: center;
    user-select: none;
  }
  .num {
    flex: 0 0 auto;
    width: 44px;
    text-align: right;
    padding-right: 10px;
    color: #6e7681;
    user-select: none;
  }
  .num.old {
    border-left: 1px solid rgba(48, 54, 61, 0.5);
  }

  .add {
    background: #10331f;
    color: #c3f0cd;
  }
  .add .marker,
  .add .num {
    background: #1a4d2c;
    color: #7ee2a8;
  }
  .del {
    background: #3a1d20;
    color: #ffd0cb;
  }
  .del .marker,
  .del .num {
    background: #5c2427;
    color: #ff9c95;
  }
  .ctx .marker,
  .ctx .num {
    background: rgba(48, 54, 61, 0.35);
  }

  .hunk {
    align-items: center;
    gap: 8px;
    padding: 2px 12px 2px 6px;
    background: rgba(56, 139, 253, 0.12);
    color: #79c0ff;
  }
  .meta {
    padding: 0 16px 0 24px;
    color: var(--muted);
  }
  .none {
    height: 1.6em;
  }

  .file-header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    background: var(--panel-2);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    color: var(--muted);
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 11px;
  }
  .file-header .path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    border-radius: 4px;
    background: var(--panel-3);
    color: var(--accent);
    font-size: 10px;
    font-weight: 700;
  }
</style>
