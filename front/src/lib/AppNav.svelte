<script lang="ts">
  export let currentPath = '/';
</script>

<header class="site-header">
  <a class="brand" href="/">ax-mod</a>
  <nav aria-label="Primary navigation">
    <a class:active={currentPath === '/'} href="/">Camera</a>
    <a class:active={currentPath === '/mongoword'} href="/mongoword">Mongo Word</a>
  </nav>
</header>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 64px;
    padding: 0 24px;
    border-bottom: 1px solid rgba(31, 41, 51, 0.12);
    background: rgba(255, 255, 255, 0.86);
    backdrop-filter: blur(12px);
  }

  .brand {
    font-size: 1.1rem;
    font-weight: 850;
    text-decoration: none;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  nav a {
    border-radius: 6px;
    padding: 9px 12px;
    color: #40505f;
    font-weight: 750;
    text-decoration: none;
  }

  nav a:hover,
  nav a.active {
    background: #1f6f50;
    color: #fff;
  }

  @media (max-width: 560px) {
    .site-header {
      align-items: flex-start;
      flex-direction: column;
      padding: 14px 16px;
    }

    nav {
      width: 100%;
    }

    nav a {
      flex: 1;
      text-align: center;
    }
  }
</style>
