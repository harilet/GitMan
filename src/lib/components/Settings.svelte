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
    margin: 0 0 14px;
    font-size: 12px;
  }
  .scope {
    align-items: flex-start;
    gap: 8px !important;
    font-size: 12px;
  }
  .scope input {
    margin-top: 2px;
  }
  .location {
    margin-top: 10px;
    font-size: 11px;
    word-break: break-all;
  }
</style>
