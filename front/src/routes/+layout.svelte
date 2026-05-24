<script lang="ts">
  import { page } from '$app/stores';
  import AppNav from '$lib/AppNav.svelte';
  import DetectorRuntime from '$lib/camera/DetectorRuntime.svelte';

  let { children } = $props();

  let currentPath = $derived($page.url.pathname);
</script>

<svelte:head>
  <title>ax-mod</title>
  <meta name="description" content="Camera color detection and Mongo-backed word tools." />
</svelte:head>

<DetectorRuntime />

<div class="app-frame">
  <AppNav {currentPath} />

  <main class="page-shell">
    {@render children()}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    min-width: 320px;
    background:
      linear-gradient(120deg, rgba(25, 135, 84, 0.12), transparent 38%),
      linear-gradient(230deg, rgba(13, 110, 253, 0.1), transparent 42%),
      #f7f5ef;
    color: #1f2933;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(a) {
    color: inherit;
  }

  :global(button),
  :global(input),
  :global(select) {
    font: inherit;
  }

  .app-frame {
    min-height: 100vh;
  }

  .page-shell {
    min-height: calc(100vh - 64px);
    padding: 32px 16px;
  }

  @media (max-width: 560px) {
    .page-shell {
      min-height: calc(100vh - 108px);
      padding: 22px 12px;
    }
  }
</style>
