<script lang="ts">
  import { app, type ViewKey } from "$lib/store.svelte";
  import Welcome from "$lib/components/Welcome.svelte";
  import Changes from "$lib/components/Changes.svelte";
  import History from "$lib/components/History.svelte";
  import Graph from "$lib/components/Graph.svelte";
  import Branches from "$lib/components/Branches.svelte";
  import Remotes from "$lib/components/Remotes.svelte";
  import Tags from "$lib/components/Tags.svelte";
  import Stashes from "$lib/components/Stashes.svelte";
  import Settings from "$lib/components/Settings.svelte";
  import DiffView from "$lib/components/DiffView.svelte";
  import BranchSwitcher from "$lib/components/BranchSwitcher.svelte";
  import TitleBar from "$lib/components/TitleBar.svelte";

  let showSettings = $state(false);

  const nav: { key: ViewKey; label: string; icon: string; count: () => number }[] = [
    { key: "changes", label: "Changes", icon: "±", count: () => app.status.length },
    { key: "history", label: "History", icon: "☰", count: () => app.log.length },
    { key: "graph", label: "Graph", icon: "⑃", count: () => app.graph?.nodes.length ?? 0 },
    { key: "branches", label: "Branches", icon: "⎇", count: () => app.localBranches.length },
    { key: "remotes", label: "Remotes", icon: "⇅", count: () => app.remotes.length },
    { key: "tags", label: "Tags", icon: "⚑", count: () => app.tags.length },
    { key: "stashes", label: "Stashes", icon: "◇", count: () => app.stashes.length },
  ];

  function onkey(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r" && app.repo) {
      e.preventDefault();
      app.refreshAll();
    }
  }
</script>

<svelte:window onkeydown={onkey} />

<div class="root">
  <TitleBar />
  <div class="main">
    {#if !app.repo}
      <Welcome />
    {:else}
      <div class="app">
    <header class="toolbar">
      <div class="repo">
        <span class="name">{app.repo.name}</span>
        <BranchSwitcher />
        {#if app.repo.dirty}<span class="badge yellow">modified</span>{/if}
      </div>

      <div class="spacer"></div>

      {#if app.remotes.length}
        <button class="btn" onclick={() => app.fetch(null)}>Fetch</button>
        <button class="btn" onclick={() => app.pull(null)}>Pull</button>
        <button
          class="btn"
          onclick={() =>
            app.push(
              app.remotes[0]?.name ?? null,
              app.repo?.branch ?? null,
              !app.branches.find((b) => b.isHead)?.upstream,
            )}>Push</button
        >
      {/if}
      <button class="btn" onclick={() => app.refreshAll()} title="Refresh (Ctrl+R)">
        Refresh
      </button>
      <button
        class="btn"
        title="Git identity (name / email)"
        onclick={() => (showSettings = true)}>⚙ Identity</button
      >
      <button class="btn ghost" onclick={() => app.closeRepo()}>Close</button>
      {#if app.busy}<span class="spinner" title="Working…"></span>{/if}
    </header>

    <div class="body">
      <nav class="rail">
        {#each nav as item (item.key)}
          <button
            class="nav-item"
            class:active={app.view === item.key}
            onclick={() => (app.view = item.key)}
          >
            <span class="ico">{item.icon}</span>
            <span class="label">{item.label}</span>
            <span class="count">{item.count()}</span>
          </button>
        {/each}
        <div class="spacer"></div>
        <div class="rail-path muted mono" title={app.repo.path}>{app.repo.path}</div>
      </nav>

      <main class="content">
        {#if app.view === "changes"}
          <Changes />
        {:else if app.view === "history"}
          <History />
        {:else if app.view === "graph"}
          <Graph />
        {:else if app.view === "branches"}
          <Branches />
        {:else if app.view === "remotes"}
          <Remotes />
        {:else if app.view === "tags"}
          <Tags />
        {:else if app.view === "stashes"}
          <Stashes />
        {/if}
      </main>

      {#if app.diff}
        <aside class="diff-panel">
          <header class="diff-head">
            <div class="diff-titles">
              <span class="diff-title">{app.diff.title}</span>
              <span class="diff-sub muted">{app.diff.subtitle}</span>
            </div>
            <button class="btn ghost icon" onclick={() => (app.diff = null)}>✕</button>
          </header>
          <div class="diff-body">
            <DiffView patch={app.diff.patch} />
          </div>
        </aside>
      {/if}
    </div>
  </div>
    {/if}
  </div>
</div>

{#if app.toast}
  <div class="toast {app.toast.kind}">{app.toast.text}</div>
{/if}

{#if showSettings}
  <Settings onclose={() => (showSettings = false)} />
{/if}

<style>
  .root {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  .main {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }
  .app {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow: hidden;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex: 0 0 auto;
  }
  .repo {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .repo .name {
    font-weight: 600;
    font-size: 14px;
  }
  .spacer {
    flex: 1;
  }
  .body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .rail {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 172px;
    flex: 0 0 auto;
    padding: 8px;
    background: var(--panel);
    border-right: 1px solid var(--border);
    overflow: hidden;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    background: transparent;
    border: none;
    border-radius: var(--radius);
    color: var(--muted);
    cursor: pointer;
    text-align: left;
    font-size: 13px;
  }
  .nav-item:hover {
    background: var(--panel-2);
    color: var(--text);
  }
  .nav-item.active {
    background: var(--panel-3);
    color: var(--text);
    box-shadow: inset 2px 0 0 var(--accent);
  }
  .nav-item .ico {
    width: 16px;
    text-align: center;
    font-size: 14px;
  }
  .nav-item .label {
    flex: 1;
  }
  .nav-item .count {
    font-size: 10px;
    color: var(--muted);
    background: var(--bg);
    border-radius: 8px;
    padding: 0 6px;
    min-width: 18px;
    text-align: center;
  }
  .rail-path {
    font-size: 10px;
    padding: 6px 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-all;
  }
  .content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  .diff-panel {
    display: flex;
    flex-direction: column;
    width: 48%;
    min-width: 320px;
    flex: 0 0 auto;
    border-left: 1px solid var(--border);
    background: var(--bg);
  }
  .diff-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex: 0 0 auto;
  }
  .diff-titles {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .diff-title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .diff-sub {
    font-size: 11px;
  }
  .diff-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .toast {
    position: fixed;
    right: 16px;
    bottom: 16px;
    max-width: 380px;
    padding: 10px 14px;
    border-radius: var(--radius);
    background: var(--panel-2);
    border: 1px solid var(--border);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    font-size: 12px;
    z-index: 200;
    white-space: pre-wrap;
  }
  .toast.error {
    border-color: #6e2a2a;
    color: #ffdcd7;
  }
  .toast.success {
    border-color: #1f4529;
    color: #aff5b4;
  }
</style>
