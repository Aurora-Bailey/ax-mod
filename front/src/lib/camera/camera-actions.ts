import { get } from 'svelte/store';
import { cameraDetector } from './detector-store';
import { listVideoDevices, openCamera, stopStream } from './media';

export async function refreshCameraDevices(): Promise<void> {
  try {
    cameraDetector.setDevices(await listVideoDevices());
  } catch (caught) {
    cameraDetector.setCameraError(getErrorMessage(caught, 'Unable to list cameras.'));
  }
}

export async function startCamera(deviceId = get(cameraDetector).selectedDeviceId): Promise<void> {
  try {
    const current = get(cameraDetector);
    const stream = await openCamera(deviceId);
    stopStream(current.stream);
    cameraDetector.setStream(stream);

    const activeDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId;
    if (activeDeviceId) {
      cameraDetector.setSelectedDeviceId(activeDeviceId);
    }

    await refreshCameraDevices();
  } catch (caught) {
    cameraDetector.setCameraError(getErrorMessage(caught, 'Unable to start camera.'));
  }
}

export function stopCamera(): void {
  const current = get(cameraDetector);
  stopStream(current.stream);
  cameraDetector.setStream(null);
}

function getErrorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
