<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { app } from "../store.svelte";

  const win = getCurrentWindow();
  let maximized = $state(false);

  $effect(() => {
    win.isMaximized().then((m) => (maximized = m));
    const unlisten = win.onResized(() => {
      win.isMaximized().then((m) => (maximized = m));
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  });

  function onDoubleClick(e: MouseEvent) {
    const el = e.target as HTMLElement;
    if (el.hasAttribute("data-tauri-drag-region")) win.toggleMaximize();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="titlebar" ondblclick={onDoubleClick}>
  <div class="brand" data-tauri-drag-region>
    <span class="logo">⎇</span>
    <span class="appname">GitWeft</span>
  </div>

  <div class="tabs">
    {#each app.sessions as s (s.id)}
      <div
        class="tab"
        class:active={s.id === app.activeId}
        role="button"
        tabindex="0"
        title={s.path}
        onclick={() => (app.activeId = s.id)}
        onkeydown={(e) => e.key === "Enter" && (app.activeId = s.id)}
      >
        <span class="dot" class:dirty={s.repo?.dirty}></span>
        <span class="tname">{s.repo?.name ?? "Repository"}</span>
        {#if s.busy}<span class="pulse"></span>{/if}
        <button
          class="tab-close"
          title="Close project"
          onclick={(e) => {
            e.stopPropagation();
            app.closeSession(s.id);
          }}>✕</button
        >
      </div>
    {/each}

    <button
      class="tab-add"
      title="Open a project"
      onclick={() => (app.activeId = null)}>＋</button
    >
  </div>

  <div class="spacer" data-tauri-drag-region></div>

  <div class="controls">
    <button class="win" title="Minimize" onclick={() => win.minimize()}>–</button>
    <button
      class="win"
      title={maximized ? "Restore" : "Maximize"}
      onclick={() => win.toggleMaximize()}
    >
      {maximized ? "❐" : "▢"}
    </button>
    <button class="win close" title="Close window" onclick={() => win.close()}>✕</button>
  </div>
</div>

<style>
  .titlebar {
    display: flex;
    align-items: stretch;
    height: 38px;
    flex: 0 0 auto;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    user-select: none;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px 0 14px;
    flex: 0 0 auto;
  }

  .logo {
    color: var(--accent);
    font-size: 15px;
  }

  .appname {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }

  .tabs {
    display: flex;
    align-items: stretch;
    gap: 4px;
    padding: 4px 0;
    overflow-x: auto;
    overflow-y: hidden;
    max-width: 70vw;
    scrollbar-width: none;
  }

  .tabs::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 7px;
    max-width: 200px;
    padding: 0 6px 0 12px;
    border-radius: 7px;
    background: var(--panel-2);
    border: 1px solid transparent;
    color: var(--muted);
    font-size: 12px;
    cursor: pointer;
    flex: 0 0 auto;
  }

  .tab:hover {
    background: var(--panel-3);
    color: var(--text);
  }

  .tab.active {
    background: var(--bg);
    border-color: var(--border);
    color: var(--text);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green);
    flex: 0 0 auto;
  }

  .dot.dirty {
    background: var(--yellow);
  }

  .tname {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    animation: spin 0.7s linear infinite;
    flex: 0 0 auto;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .tab-close {
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    border-radius: 4px;
    width: 18px;
    height: 18px;
    font-size: 10px;
    line-height: 1;
    opacity: 0.6;
    flex: 0 0 auto;
  }
  .tab-close:hover {
    background: rgba(248, 81, 73, 0.2);
    color: var(--red);
    opacity: 1;
  }
  .tab-add {
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    width: 28px;
    border-radius: 7px;
    font-size: 15px;
    flex: 0 0 auto;
  }
  .tab-add:hover {
    background: var(--panel-3);
    color: var(--text);
  }
  .spacer {
    flex: 1;
  }
  .controls {
    display: flex;
    align-items: stretch;
    flex: 0 0 auto;
  }
  .win {
    width: 46px;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
  }
  .win:hover {
    background: var(--panel-3);
    color: var(--text);
  }
  .win.close:hover {
    background: #e81123;
    color: #fff;
  }
</style>
