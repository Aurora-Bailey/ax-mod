import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import CameraDetector from './CameraDetector.svelte';
import { cameraDetector } from './detector-store';

function makeStream(): MediaStream {
  return {
    getVideoTracks: () => [],
    getTracks: () => []
  } as unknown as MediaStream;
}

describe('CameraDetector', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn()
    });
  });

  afterEach(() => {
    cameraDetector.resetForTests();
  });

  it('updates and clamps square settings from the controls', async () => {
    cameraDetector.setVideoSize(100, 80);

    render(CameraDetector);
    await fireEvent.input(screen.getByLabelText('X value'), {
      target: { value: '500', valueAsNumber: 500 }
    });

    expect(get(cameraDetector).square.x).toBe(99);
  });

  it('trains the current RGB value from the train button', async () => {
    const user = userEvent.setup();
    cameraDetector.setCurrentRgb({ r: 80, g: 90, b: 100 });

    render(CameraDetector);
    await user.click(screen.getByRole('button', { name: 'Train reference' }));

    expect(get(cameraDetector).referenceRgb).toEqual({ r: 80, g: 90, b: 100 });
  });

  it('attaches an existing stream when remounted after navigation', async () => {
    const stream = makeStream();
    cameraDetector.setStream(stream);

    render(CameraDetector);

    await waitFor(() => {
      expect(document.querySelector('video')?.srcObject).toBe(stream);
    });
  });
});
