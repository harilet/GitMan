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
</script>

<div data-tauri-drag-region class="titlebar">
  <div data-tauri-drag-region class="brand">
    <span class="brand-mark" aria-hidden="true">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        height="18"
        width="18"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="6" cy="5" r="2.2" />
        <circle cx="6" cy="19" r="2.2" />
        <circle cx="18" cy="8" r="2.2" />
        <path d="M6 7.2v9.6" />
        <path d="M18 10.2c0 4-4.2 4.2-7.4 5.6" />
      </svg>
    </span>
    <span class="brand-name">GIT<span class="accent">·</span>WEFT</span>
  </div>

  <div data-tauri-drag-region class="tabs">
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
      onclick={() => (app.activeId = null)}>+</button
    >
  </div>test

  <div data-tauri-drag-region class="spacer"></div>

  <div class="controls">
    <button
      class="win settings-btn"
      title="Settings (Ctrl+,)"
      aria-label="Settings"
      onclick={() => (app.settingsOpen = true)}
    >
      <svg viewBox="0 0 24 24" height="14" width="14">
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
        <circle cx="9" cy="7" r="2.2" />
        <circle cx="15" cy="12" r="2.2" />
        <circle cx="8" cy="17" r="2.2" />
      </svg>
    </button>
    <button class="win" title="Minimize" aria-label="Minimize" onclick={() => win.minimize()}>
      <svg viewBox="0 0 16.933333 16.933334" height="12" width="12">
        <path
          d="M 1.8515625,7.8046875 A 0.66145998,0.66145998 0 0 0 1.1914062,8.4667969 0.66145998,0.66145998 0 0 0 1.8515625,9.1289063 H 15.082031 A 0.66145998,0.66145998 0 0 0 15.742188,8.4667969 0.66145998,0.66145998 0 0 0 15.082031,7.8046875 Z"
        />
      </svg>
    </button>
    <button
      class="win"
      title={maximized ? "Restore" : "Maximize"}
      aria-label={maximized ? "Restore" : "Maximize"}
      onclick={() => win.toggleMaximize()}
    >
      <svg viewBox="0 0 16.933333 16.933334" height="12" width="12">
        <path
          d="M 3.1757812 1.1914062 C 2.087675 1.1914062 1.1914062 2.087675 1.1914062 3.1757812 L 1.1914062 13.757812 C 1.1914068 14.845918 2.0876754 15.742188 3.1757812 15.742188 L 13.757812 15.742188 C 14.845918 15.742187 15.742187 14.845918 15.742188 13.757812 L 15.742188 3.1757812 C 15.742188 2.0876754 14.845918 1.1914068 13.757812 1.1914062 L 3.1757812 1.1914062 z M 3.1757812 2.5136719 L 13.757812 2.5136719 C 14.13096 2.5136721 14.419922 2.8026342 14.419922 3.1757812 L 14.419922 13.757812 C 14.419922 14.130959 14.130959 14.419922 13.757812 14.419922 L 3.1757812 14.419922 C 2.8026342 14.419922 2.5136721 14.13096 2.5136719 13.757812 L 2.5136719 3.1757812 C 2.5136719 2.802634 2.802634 2.5136719 3.1757812 2.5136719 z"
        />
      </svg>
    </button>
    <button class="win close" title="Close window" aria-label="Close window" onclick={() => win.close()}>
      <svg viewBox="0 0 16.933333 16.933334" height="12" width="12">
        <path
          d="M 2.4863281 1.8535156 A 0.66145998 0.66145998 0 0 0 2.0449219 2.0449219 A 0.66145998 0.66145998 0 0 0 2.0449219 2.9804688 L 7.53125 8.4648438 L 2.0449219 13.951172 A 0.66145998 0.66145998 0 0 0 2.0449219 14.886719 A 0.66145998 0.66145998 0 0 0 2.9804688 14.886719 L 8.4648438 9.4023438 L 13.951172 14.886719 A 0.66145998 0.66145998 0 0 0 14.886719 14.886719 A 0.66145998 0.66145998 0 0 0 14.886719 13.951172 L 9.4023438 8.4648438 L 14.886719 2.9804688 A 0.66145998 0.66145998 0 0 0 14.886719 2.0449219 A 0.66145998 0.66145998 0 0 0 13.951172 2.0449219 L 8.4648438 7.53125 L 2.9804688 2.0449219 A 0.66145998 0.66145998 0 0 0 2.4863281 1.8535156 z"
        />
      </svg>
    </button>
  </div>
</div>

<style>
  .titlebar {
    display: flex;
    align-items: stretch;
    height: 47px;
    flex: 0 0 auto;
    background: var(--background-color);
    border-bottom: 1px solid var(--border-color);
    user-select: none;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 18px;
    border-right: 1px solid var(--border-color);
    color: var(--text-color);
    flex-shrink: 0;
  }
  .brand-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid var(--border-strong);
    color: var(--primary-color);
    background: var(--surface-color);
  }
  .brand-name {
    font-size: 12px;
    letter-spacing: 0.18em;
    font-weight: 600;
  }

  .tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    padding: 0 12px;
  }
  .tabs::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px 6px 12px;
    border: 1px solid transparent;
    color: var(--muted-color);
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.1em;
    white-space: nowrap;
    flex-shrink: 0;
    max-width: 220px;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }
  .tab:hover {
    color: var(--text-color);
    border-color: var(--border-color);
  }
  .tab.active {
    background: var(--hover-color);
    border-color: var(--border-strong);
    color: var(--text-color);
  }
  .dot {
    width: 6px;
    height: 6px;
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
    border: 2px solid var(--border-strong);
    border-top-color: var(--primary-color);
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
    padding: 0;
    width: 16px;
    height: 16px;
    font-size: 10px;
    line-height: 1;
    opacity: 0.6;
    flex: 0 0 auto;
  }
  .tab-close:hover {
    opacity: 1;
    color: var(--red);
  }
  .tab-add {
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted-color);
    cursor: pointer;
    width: 26px;
    height: 26px;
    font-size: 15px;
    line-height: 1;
    flex: 0 0 auto;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }
  .tab-add:hover {
    background: var(--hover-color);
    border-color: var(--border-color);
    color: var(--text-color);
  }

  .spacer {
    flex: 1;
    min-width: 12px;
  }

  .controls {
    display: flex;
    align-items: stretch;
    border-left: 1px solid var(--border-color);
    flex: 0 0 auto;
  }
  .win {
    width: 46px;
    border: none;
    background: transparent;
    color: var(--muted-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }
  .win svg {
    fill: currentColor;
  }
  .settings-btn {
    width: 42px;
    border-left: 1px solid var(--border-color);
    border-right: 1px solid var(--border-color);
  }
  .settings-btn svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
  }
  .settings-btn circle {
    fill: var(--background-color);
    stroke: currentColor;
  }
  .win:hover {
    background: var(--hover-color);
    color: var(--text-color);
  }
  .win.close {
    border-left: 1px solid var(--border-color);
    width: 50px;
  }
  .win.close:hover {
    background: #d84a4a;
    color: #ffffff;
  }
</style>
