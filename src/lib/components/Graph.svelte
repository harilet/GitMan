<script lang="ts">
  import { app } from "../store.svelte";
  import type { BranchGraphNode } from "../api";

  const NODE_W = 176;
  const NODE_H = 40;
  const COL_GAP = 224;
  const ROW_GAP = 60;
  const PAD_X = 28;
  const PAD_Y = 20;

  interface PNode extends BranchGraphNode {
    x: number;
    y: number;
  }
  interface PEdge {
    d: string;
    kind: "fork" | "merge";
  }

  const layout = $derived.by(() => {
    const g = app.graph;
    if (!g || g.nodes.length === 0) {
      return { nodes: [] as PNode[], edges: [] as PEdge[], width: 0, height: 0 };
    }

    const byName = new Map(g.nodes.map((n) => [n.name, n]));
    const children = new Map<string, string[]>();
    for (const n of g.nodes) {
      if (n.parent && byName.has(n.parent)) {
        const arr = children.get(n.parent) ?? [];
        arr.push(n.name);
        children.set(n.parent, arr);
      }
    }
    for (const arr of children.values()) arr.sort();

    const visited = new Set<string>();
    const depthOf = new Map<string, number>();
    let order = 0;
    const pos = new Map<string, { x: number; y: number }>();
    const walk = (name: string, depth: number) => {
      if (visited.has(name)) return;
      visited.add(name);
      depthOf.set(name, depth);
      pos.set(name, { x: PAD_X + depth * COL_GAP, y: PAD_Y + order * ROW_GAP });
      order++;
      for (const c of children.get(name) ?? []) walk(c, depth + 1);
    };

    const roots = g.nodes
      .filter((n) => !n.parent || !byName.has(n.parent))
      .map((n) => n.name)
      .sort();
    for (const r of roots) walk(r, 0);
    for (const n of g.nodes) if (!visited.has(n.name)) walk(n.name, 0);

    const nodes: PNode[] = g.nodes.map((n) => {
      const p = pos.get(n.name)!;
      return { ...n, x: p.x, y: p.y };
    });

    const edges: PEdge[] = [];
    const center = (n: PNode) => ({ x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 });
    for (const n of nodes) {
      if (n.parent && byName.has(n.parent)) {
        const p = nodes.find((m) => m.name === n.parent)!;
        const x1 = p.x + NODE_W;
        const y1 = center(p).y;
        const x2 = n.x;
        const y2 = center(n).y;
        const dx = Math.max(20, Math.abs(x2 - x1) / 2);
        edges.push({
          kind: "fork",
          d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
        });
      }
      for (const m of n.mergesInto) {
        if (!byName.has(m)) continue;
        const t = nodes.find((q) => q.name === m)!;
        const sx = center(n).x;
        const sy = n.y;
        const tx = center(t).x;
        const ty = t.y;
        const lift = Math.max(30, Math.abs(tx - sx) / 4);
        edges.push({
          kind: "merge",
          d: `M ${sx} ${sy} C ${sx} ${sy - lift}, ${tx} ${ty - lift}, ${tx} ${ty}`,
        });
      }
    }

    const width = Math.max(...nodes.map((n) => n.x), 0) + NODE_W + PAD_X;
    const height = order * ROW_GAP + NODE_H + PAD_Y;
    return { nodes, edges, width, height };
  });

  const stats = $derived.by(() => {
    const nodes = app.graph?.nodes ?? [];
    let merged = 0;
    for (const n of nodes) merged += n.mergesInto.length;
    return { total: nodes.length, merges: merged };
  });
</script>

<div class="graph-view">
  <div class="head">
    <div class="legend">
      <span class="key"
        ><svg width="26" height="8"
          ><line x1="0" y1="4" x2="26" y2="4" class="fork-line" /></svg
        > branched from</span
      >
      <span class="key"
        ><svg width="26" height="8"
          ><line x1="0" y1="4" x2="26" y2="4" class="merge-line" /></svg
        > merged into</span
      >
    </div>
    <div class="head-right">
      <span class="label">{stats.total} branches &middot; {stats.merges} merges</span>
      <label class="toggle label">
        <input
          type="checkbox"
          checked={app.graphIncludeRemote}
          onchange={(e) => app.setGraphRemote(e.currentTarget.checked)}
        />
        remote
      </label>
    </div>
  </div>

  <div class="canvas main-scrollbar">
    {#if layout.nodes.length === 0}
      <div class="empty">No branches to display</div>
    {:else}
      <div class="stage" style="width:{layout.width}px; height:{layout.height}px">
        <svg
          class="edges"
          width={layout.width}
          height={layout.height}
          viewBox="0 0 {layout.width} {layout.height}"
        >
          <defs>
            <marker
              id="arrow-merge"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--purple)" />
            </marker>
          </defs>
          {#each layout.edges as e, i (i)}
            {#if e.kind === "merge"}
              <path d={e.d} class="edge merge" marker-end="url(#arrow-merge)" />
            {:else}
              <path d={e.d} class="edge fork" />
            {/if}
          {/each}
        </svg>

        {#each layout.nodes as n (n.name)}
          <div
            class="node"
            class:head={n.isHead}
            class:remote={n.isRemote}
            style="left:{n.x}px; top:{n.y}px; width:{NODE_W}px; height:{NODE_H}px"
            title="{n.name} · {n.tipShort}{n.parent ? ` · from ${n.parent}` : ''}"
          >
            <span class="node-icon">{n.isRemote ? "R" : "B"}</span>
            <span class="node-name">{n.name}</span>
            <span class="node-tip mono">{n.tipShort}</span>
            {#if n.isHead}<span class="chip green">HEAD</span>{/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .graph-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 14px;
    background: var(--background-color);
    border-bottom: 1px solid var(--border-color);
    flex: 0 0 auto;
    flex-wrap: wrap;
  }
  .legend {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 10px;
    color: var(--muted-color);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .key {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .head-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .fork-line {
    stroke: var(--primary-color);
    stroke-width: 2;
  }
  .merge-line {
    stroke: var(--purple);
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
  }
  .toggle input {
    accent-color: var(--primary-color);
    margin: 0;
  }
  .canvas {
    flex: 1;
    min-height: 0;
    overflow: auto;
    background:
      radial-gradient(circle at 1px 1px, rgba(124, 130, 142, 0.16) 1px, transparent 0)
        0 0 / 22px 22px;
  }
  .empty {
    padding: 40px 16px;
    text-align: center;
  }
  .stage {
    position: relative;
  }
  .edges {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .edge {
    fill: none;
    stroke-width: 2;
  }
  .edge.fork {
    stroke: var(--primary-color);
  }
  .edge.merge {
    stroke: var(--purple);
    stroke-dasharray: 5 4;
  }
  .node {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 8px;
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    border-radius: 0;
    font-size: 11px;
    z-index: 1;
  }
  .node.head {
    border-color: var(--green);
    box-shadow: inset 2px 0 0 var(--green);
  }
  .node.remote {
    border-style: dashed;
  }
  .node-icon {
    color: var(--muted-color);
    font-size: 9px;
    border: 1px solid var(--border-strong);
    width: 15px;
    height: 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }
  .node-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .node-tip {
    font-size: 10px;
    color: var(--primary-color);
    flex: 0 0 auto;
  }
  .chip {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 1px 4px;
    border: 1px solid var(--border-color);
    color: var(--muted-color);
    flex: 0 0 auto;
  }
  .chip.green {
    color: var(--green);
    border-color: #25452f;
    background: #12261a;
  }
</style>
