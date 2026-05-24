<script lang="ts">
  import { onMount } from 'svelte';
  import { createWord, listWords } from './api';
  import type { WordRecord, WordsResponse } from './api';

  export let loadWords: () => Promise<WordsResponse> = listWords;
  export let saveWord: (word: string) => Promise<WordRecord> = createWord;

  let words: WordRecord[] = [];
  let currentIndex = 0;
  let wordInput = '';
  let loading = true;
  let saving = false;
  let error = '';

  $: currentWord = words[currentIndex];
  $: hasWords = words.length > 0;
  $: canGoPrevious = currentIndex > 0;
  $: canGoNext = currentIndex < words.length - 1;

  onMount(() => {
    void refreshWords();
  });

  async function refreshWords(): Promise<void> {
    loading = true;
    error = '';

    try {
      const response = await loadWords();
      words = response.words;
      currentIndex = words.length > 0 ? Math.min(currentIndex, words.length - 1) : 0;
    } catch (caught) {
      error = getErrorMessage(caught, 'Unable to load words.');
    } finally {
      loading = false;
    }
  }

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    const word = wordInput.trim();
    if (!word) {
      error = 'Enter a word before saving.';
      return;
    }

    saving = true;
    error = '';

    try {
      const created = await saveWord(word);
      words = [...words, created];
      currentIndex = words.length - 1;
      wordInput = '';
    } catch (caught) {
      error = getErrorMessage(caught, 'Unable to save word.');
    } finally {
      saving = false;
    }
  }

  function previousWord(): void {
    currentIndex = Math.max(0, currentIndex - 1);
  }

  function nextWord(): void {
    currentIndex = Math.min(words.length - 1, currentIndex + 1);
  }

  function getErrorMessage(caught: unknown, fallback: string): string {
    return caught instanceof Error ? caught.message : fallback;
  }
</script>

<section class="word-page" aria-labelledby="page-title">
  <div class="word-tool">
    <div class="intro">
      <p class="eyebrow">Mongo Word</p>
      <h1 id="page-title">Word queue</h1>
    </div>

    <form class="word-form" onsubmit={handleSubmit}>
      <label for="word">Word</label>
      <div class="entry-row">
        <input
          id="word"
          name="word"
          bind:value={wordInput}
          autocomplete="off"
          maxlength="100"
          placeholder="Type a word"
          disabled={saving}
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Saving' : 'Save'}
        </button>
      </div>
    </form>

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    <section class="display" aria-label="Saved words">
      {#if loading}
        <p class="status" role="status">Loading words...</p>
      {:else if !hasWords}
        <p class="status">No words yet.</p>
      {:else}
        <p class="position">{currentIndex + 1} of {words.length}</p>
        <p class="current-word" data-testid="current-word">{currentWord.word}</p>
        <time datetime={currentWord.createdAt}>{new Date(currentWord.createdAt).toLocaleString()}</time>

        <div class="nav-row">
          <button type="button" onclick={previousWord} disabled={!canGoPrevious}>Previous</button>
          <button type="button" onclick={nextWord} disabled={!canGoNext}>Next</button>
        </div>
      {/if}
    </section>
  </div>
</section>

<style>
  .word-page {
    display: grid;
    place-items: center;
  }

  .word-tool {
    width: min(100%, 560px);
    border: 1px solid rgba(31, 41, 51, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 18px 60px rgba(31, 41, 51, 0.13);
    padding: 28px;
  }

  .intro {
    margin-bottom: 24px;
  }

  .eyebrow {
    margin: 0 0 8px;
    color: #47624f;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: 2.5rem;
    line-height: 1.05;
    font-weight: 800;
  }

  .word-form {
    display: grid;
    gap: 10px;
  }

  label {
    font-weight: 700;
  }

  .entry-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
  }

  input,
  button {
    min-height: 44px;
    border-radius: 6px;
    font: inherit;
  }

  input {
    width: 100%;
    border: 1px solid #b9c2b4;
    padding: 0 14px;
    background: #fff;
    color: #1f2933;
  }

  input:focus {
    outline: 3px solid rgba(25, 135, 84, 0.22);
    border-color: #198754;
  }

  button {
    border: 0;
    padding: 0 18px;
    background: #1f6f50;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: #185c42;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  .error {
    margin: 14px 0 0;
    color: #9f1d20;
    font-weight: 700;
  }

  .display {
    min-height: 230px;
    display: grid;
    align-content: center;
    gap: 14px;
    margin-top: 28px;
    padding-top: 24px;
    border-top: 1px solid rgba(31, 41, 51, 0.12);
  }

  .status,
  .position,
  time {
    margin: 0;
    color: #5d6670;
  }

  .current-word {
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 3rem;
    line-height: 1.05;
    font-weight: 850;
  }

  .nav-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .nav-row button {
    background: #2d4f73;
  }

  .nav-row button:hover:not(:disabled) {
    background: #253f5b;
  }

  @media (max-width: 520px) {
    .word-tool {
      padding: 22px;
    }

    .entry-row {
      grid-template-columns: 1fr;
    }

    h1 {
      font-size: 2rem;
    }

    .current-word {
      font-size: 2.35rem;
    }
  }
</style>
