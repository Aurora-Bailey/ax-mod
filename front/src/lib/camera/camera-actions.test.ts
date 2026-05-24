import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cameraDetector } from './detector-store';
import {
  refreshCameraDevices,
  resetCameraMediaForTests,
  setCameraMediaForTests,
  startCamera
} from './camera-actions';

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

  it('keeps an active stream running when device refresh fails', async () => {
    const existingStream = makeStream();
    const stopStream = vi.fn();

    cameraDetector.setStream(existingStream);
    setCameraMediaForTests({
      listVideoDevices: async () => {
        throw new Error('Device list unavailable');
      },
      stopStream
    });

    await refreshCameraDevices();

    expect(stopStream).not.toHaveBeenCalled();
    expect(get(cameraDetector)).toMatchObject({
      stream: existingStream,
      cameraActive: true,
      cameraError: 'Device list unavailable'
    });
  });
});
