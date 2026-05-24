import { get } from 'svelte/store';
import { cameraDetector } from './detector-store';
import { listVideoDevices, openCamera, stopStream } from './media';

type CameraMedia = {
  listVideoDevices: typeof listVideoDevices;
  openCamera: typeof openCamera;
  stopStream: typeof stopStream;
};

let cameraMedia: CameraMedia = {
  listVideoDevices,
  openCamera,
  stopStream
};

export async function refreshCameraDevices(): Promise<void> {
  try {
    cameraDetector.setDevices(await cameraMedia.listVideoDevices());
  } catch (caught) {
    cameraDetector.setCameraError(getErrorMessage(caught, 'Unable to list cameras.'));
  }
}

export async function startCamera(deviceId = get(cameraDetector).selectedDeviceId): Promise<void> {
  const current = get(cameraDetector);

  try {
    const stream = await cameraMedia.openCamera(deviceId);
    cameraMedia.stopStream(current.stream);
    cameraDetector.setStream(stream);

    const activeDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId;
    if (activeDeviceId) {
      cameraDetector.setSelectedDeviceId(activeDeviceId);
    }

    await refreshCameraDevices();
  } catch (caught) {
    cameraMedia.stopStream(current.stream);
    cameraDetector.setStream(null);
    cameraDetector.setCameraError(getErrorMessage(caught, 'Unable to start camera.'));
  }
}

export function stopCamera(): void {
  const current = get(cameraDetector);
  cameraMedia.stopStream(current.stream);
  cameraDetector.setStream(null);
}

export function setCameraMediaForTests(media: Partial<CameraMedia>): void {
  cameraMedia = {
    ...cameraMedia,
    ...media
  };
}

export function resetCameraMediaForTests(): void {
  cameraMedia = {
    listVideoDevices,
    openCamera,
    stopStream
  };
}

function getErrorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
