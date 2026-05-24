import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cameraDetector } from './detector-store';
import { resetCameraMediaForTests, setCameraMediaForTests, startCamera } from './camera-actions';

function makeStream(): MediaStream {
  return {
    getVideoTracks: () => [],
    getTracks: () => []
  } as unknown as MediaStream;
}

describe('camera actions', () => {
  afterEach(() => {
    resetCameraMediaForTests();
    cameraDetector.resetForTests();
  });

  it('stops and clears an existing stream when switching cameras fails', async () => {
    const existingStream = makeStream();
    const stopStream = vi.fn();

    cameraDetector.setStream(existingStream);
    setCameraMediaForTests({
      openCamera: async () => {
        throw new Error('Permission denied');
      },
      stopStream
    });

    await startCamera('next-camera');

    expect(stopStream).toHaveBeenCalledWith(existingStream);
    expect(get(cameraDetector)).toMatchObject({
      stream: null,
      cameraActive: false,
      cameraError: 'Permission denied'
    });
  });
});
