<script lang="ts">
  import type { CommitInfo } from "../api";
  import { app } from "../store.svelte";
  import { relativeTime } from "../format";

  let filter = $state("");

  const refsByOid = $derived.by(() => {
    const map = new Map<string, { label: string; kind: string }[]>();
    for (const b of app.branches) {
      if (!b.target) continue;
      const list = map.get(b.target) ?? [];
      const label = b.name;
      list.push({ label, kind: b.isHead ? "head" : b.isRemote ? "remote" : "branch" });
      map.set(b.target, list);
    }
    for (const t of app.tags) {
      const list = map.get(t.target) ?? [];
      list.push({ label: t.name, kind: "tag" });
      map.set(t.target, list);
    }
    return map;
  });

  const commits = $derived.by(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return app.log;
    return app.log.filter(
      (c) =>
        c.summary.toLowerCase().includes(f) ||
        c.author.toLowerCase().includes(f) ||
        c.oid.toLowerCase().includes(f),
    );
  });
</script>

<div class="history">
  <div class="head">
    <input class="input" placeholder="Filter commits…" bind:value={filter} />
  </div>
  <div class="commits">
    {#each commits as commit (commit.oid)}
      <div
        class="commit"
        class:selected={app.selectedCommit?.oid === commit.oid}
        role="button"
        tabindex="0"
        onclick={() => app.loadCommit(commit)}
        onkeydown={(e) => e.key === "Enter" && app.loadCommit(commit)}
      >
        <div class="top">
          <span class="summary">{commit.summary || "(no message)"}</span>
          {#each refsByOid.get(commit.oid) ?? [] as ref}
            <span class="badge {ref.kind === 'tag' ? 'yellow' : ref.kind === 'head' ? 'green' : ref.kind === 'remote' ? 'purple' : 'blue'}">{ref.label}</span>
          {/each}
        </div>
        <div class="meta">
          <span class="mono oid">{commit.short}</span>
          <span>{commit.author}</span>
          <span class="muted">{relativeTime(commit.time)}</span>
        </div>
      </div>
    {:else}
      <div class="empty">No commits yet</div>
    {/each}
    {#if app.logHasMore}
      <button class="btn load-more" onclick={() => app.loadMoreLog()}>
        Load more commits
      </button>
    {/if}
  </div>
</div>

<style>
  .history {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .head {
    padding: 8px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex: 0 0 auto;
  }
  .commits {
    overflow: auto;
    flex: 1;
  }
  .load-more {
    display: block;
    margin: 10px auto;
  }
  .commit {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(48, 54, 61, 0.5);
    cursor: pointer;
  }
  .commit:hover {
    background: var(--panel);
  }
  .commit.selected {
    background: var(--panel-2);
    box-shadow: inset 3px 0 0 var(--accent);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .summary {
    font-weight: 500;
  }
  .meta {
    display: flex;
    gap: 10px;
    font-size: 11px;
    color: var(--muted);
  }
  .oid {
    color: var(--accent);
  }
  .empty {
    padding: 20px 12px;
    color: var(--muted);
  }
</style>
