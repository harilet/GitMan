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

    const width =
      Math.max(...nodes.map((n) => n.x), 0) + NODE_W + PAD_X;
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
    <div class="titles">
      <h4>Branch graph</h4>
      <span class="muted">
        {stats.total} branches · {stats.merges} merges
      </span>
    </div>
    <div class="legend">
      <span class="key"><svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" class="fork-line" /></svg> branched from</span>
      <span class="key"><svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" class="merge-line" /></svg> merged into</span>
      <label class="toggle">
        <input
          type="checkbox"
          checked={app.graphIncludeRemote}
          onchange={(e) => app.setGraphRemote(e.currentTarget.checked)}
        />
        remote
      </label>
    </div>
  </div>

  <div class="canvas">
    {#if layout.nodes.length === 0}
      <div class="empty muted">No branches to display</div>
    {:else}
      <div
        class="stage"
        style="width:{layout.width}px; height:{layout.height}px"
      >
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
            <span class="node-icon">{n.isRemote ? "☁" : "⎇"}</span>
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
    padding: 10px 14px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex: 0 0 auto;
    flex-wrap: wrap;
  }
  .titles {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .head h4 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  .head .muted {
    font-size: 11px;
  }
  .legend {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 11px;
    color: var(--muted);
  }
  .key {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .fork-line {
    stroke: var(--accent);
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
    gap: 5px;
    cursor: pointer;
  }
  .canvas {
    flex: 1;
    min-height: 0;
    overflow: auto;
    background:
      radial-gradient(circle at 1px 1px, rgba(139, 148, 158, 0.14) 1px, transparent 0)
        0 0 / 22px 22px;
  }
  .empty {
    padding: 40px;
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
    stroke: var(--accent);
  }
  .edge.merge {
    stroke: var(--purple);
    stroke-dasharray: 5 4;
  }
  .node {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    font-size: 12px;
    z-index: 1;
  }
  .node.head {
    border-color: var(--green);
    box-shadow: 0 0 0 1px rgba(63, 185, 80, 0.35);
  }
  .node.remote {
    border-style: dashed;
  }
  .node-icon {
    color: var(--muted);
    font-size: 12px;
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
    color: var(--accent);
  }
  .chip {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 8px;
    border: 1px solid var(--border);
    color: var(--muted);
  }
  .chip.green {
    color: var(--green);
    border-color: #1f4529;
    background: #12261a;
  }
</style>
