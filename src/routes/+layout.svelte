<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { applyAccent, loadAccent } from "$lib/settings";

  let { children } = $props();

  onMount(() => applyAccent(loadAccent()));
</script>

{@render children()}
