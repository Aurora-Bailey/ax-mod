import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WordApp from './WordApp.svelte';
import type { WordRecord } from './api';

function makeWord(word: string, index = 1): WordRecord {
  return {
    id: String(index),
    word,
    createdAt: new Date(Date.UTC(2026, 4, 23, 12, index, 0)).toISOString()
  };
}

describe('WordApp', () => {
  it('renders the empty state after loading words', async () => {
    render(WordApp, {
      props: {
        loadWords: async () => ({ words: [] }),
        saveWord: async (word: string) => makeWord(word)
      }
    });

    expect(await screen.findByText('No words yet.')).toBeInTheDocument();
  });

  it('submits a trimmed word and displays the created result', async () => {
    const user = userEvent.setup();
    const saveWord = vi.fn(async (word: string) => makeWord(word));

    render(WordApp, {
      props: {
        loadWords: async () => ({ words: [] }),
        saveWord
      }
    });

    await screen.findByText('No words yet.');
    await user.type(screen.getByLabelText('Word'), '  Aurora  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(saveWord).toHaveBeenCalledWith('Aurora'));
    expect(await screen.findByTestId('current-word')).toHaveTextContent('Aurora');
  });

  it('navigates saved words one at a time', async () => {
    const user = userEvent.setup();

    render(WordApp, {
      props: {
        loadWords: async () => ({ words: [makeWord('alpha', 1), makeWord('beta', 2)] }),
        saveWord: async (word: string) => makeWord(word, 3)
      }
    });

    expect(await screen.findByTestId('current-word')).toHaveTextContent('alpha');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('current-word')).toHaveTextContent('beta');
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByTestId('current-word')).toHaveTextContent('alpha');
  });

  it('shows load errors from the backend', async () => {
    render(WordApp, {
      props: {
        loadWords: async () => {
          throw new Error('Backend unavailable');
        },
        saveWord: async (word: string) => makeWord(word)
      }
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Backend unavailable');
  });
});
