<script lang="ts">
  import { app } from "../store.svelte";
  import { autofocus } from "../actions";
  import Modal from "./Modal.svelte";

  let { onclose }: { onclose: () => void } = $props();

  let name = $state(app.user?.name ?? "");
  let email = $state(app.user?.email ?? "");
  let global = $state(false);
  let saving = $state(false);

  async function save() {
    saving = true;
    const ok = await app.saveUserConfig(name, email, global);
    saving = false;
    if (ok) onclose();
  }
</script>

<Modal title="Git identity" {onclose}>
  <p class="muted intro">
    The name and email used as the author of your commits.
  </p>
  <label class="field">
    <span>Name</span>
    <input class="input" placeholder="Jane Developer" bind:value={name} use:autofocus />
  </label>
  <label class="field">
    <span>Email</span>
    <input class="input" placeholder="jane@example.com" bind:value={email} />
  </label>
  <label class="row scope">
    <input type="checkbox" bind:checked={global} />
    <span>Apply globally (all repositories) instead of just this project</span>
  </label>
  <div class="location muted">
    {global ? "Writing to ~/.gitconfig" : `Writing to ${app.repo?.path ?? ""}/.git/config`}
  </div>

  {#snippet footer()}
    <button class="btn" onclick={onclose}>Cancel</button>
    <button class="btn primary" disabled={saving} onclick={save}>
      {saving ? "Saving…" : "Save"}
    </button>
  {/snippet}
</Modal>

<style>
  .intro {
    margin: 0 0 18px;
    font-size: 12px;
    line-height: 1.7;
  }
  .scope {
    align-items: flex-start;
    gap: 8px !important;
    font-size: 12px;
    margin-bottom: 14px;
  }
  .scope input {
    margin-top: 2px;
    accent-color: var(--primary-color);
  }
  .location {
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    background: var(--background-color);
    font-size: 10px;
    color: var(--muted-color);
    word-break: break-all;
    line-height: 1.6;
  }
</style>
