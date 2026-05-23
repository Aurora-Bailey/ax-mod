export type WordRecord = {
  id: string;
  word: string;
  createdAt: string;
};

export type WordsResponse = {
  words: WordRecord[];
};

export type CreatedWordResponse = {
  word: WordRecord;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export async function listWords(): Promise<WordsResponse> {
  const response = await fetch(`${API_BASE_URL}/words`);
  return parseJsonResponse<WordsResponse>(response);
}

export async function createWord(word: string): Promise<WordRecord> {
  const response = await fetch(`${API_BASE_URL}/words`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ word })
  });

  return (await parseJsonResponse<CreatedWordResponse>(response)).word;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'Request failed';

    throw new Error(message);
  }

  return body as T;
}
