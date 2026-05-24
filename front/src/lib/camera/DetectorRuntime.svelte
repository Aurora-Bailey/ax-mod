<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { cameraDetector } from './detector-store';
  import { averageRgbFromImageData, clampSquare } from './detection';
  import { createMatchTransitionNotifier } from './match-transition';
  import { refreshCameraDevices, startCamera, stopCamera } from './camera-actions';
  import { playDetectorBeep } from './sound';

  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let animationFrame = 0;
  let unsubscribe: (() => void) | undefined;
  let attachedStream: MediaStream | null = null;

  const matchNotifier = createMatchTransitionNotifier(playDetectorBeep);

  onMount(() => {
    cameraDetector.hydrate();
    void initializeCamera();

    unsubscribe = cameraDetector.subscribe((state) => {
      attachStream(state.stream);
      matchNotifier.update(state.isMatch);
    });

    animationFrame = requestAnimationFrame(sampleLoop);

    return () => {
      cancelAnimationFrame(animationFrame);
      unsubscribe?.();
      stopCamera();
    };
  });

  async function initializeCamera(): Promise<void> {
    await refreshCameraDevices();

    const state = get(cameraDetector);
    if (state.selectedDeviceId) {
      await startCamera(state.selectedDeviceId);
    }
  }

  function attachStream(stream: MediaStream | null): void {
    if (!videoElement || attachedStream === stream) {
      return;
    }

    attachedStream = stream;
    videoElement.srcObject = stream;

    if (stream) {
      void videoElement.play();
    }
  }

  function sampleLoop(): void {
    sampleCurrentSquare();
    animationFrame = requestAnimationFrame(sampleLoop);
  }

  function sampleCurrentSquare(): void {
    const currentState = get(cameraDetector);
    const videoWidth = videoElement?.videoWidth ?? 0;
    const videoHeight = videoElement?.videoHeight ?? 0;

    if (!currentState.stream) {
      return;
    }

    if (!videoElement || !canvasElement || videoElement.readyState < 2 || !videoWidth || !videoHeight) {
      if (currentState.currentRgb) {
        cameraDetector.setCurrentRgb(null);
      }

      return;
    }

    cameraDetector.setVideoSize(videoWidth, videoHeight);

    const state = get(cameraDetector);
    const square = clampSquare(state.square, videoWidth, videoHeight);
    const context = canvasElement.getContext('2d', { willReadFrequently: true });

    if (!context) {
      cameraDetector.setCurrentRgb(null);
      return;
    }

    canvasElement.width = square.width;
    canvasElement.height = square.height;
    context.drawImage(
      videoElement,
      square.x,
      square.y,
      square.width,
      square.height,
      0,
      0,
      square.width,
      square.height
    );

    const imageData = context.getImageData(0, 0, square.width, square.height);
    cameraDetector.setCurrentRgb(
      averageRgbFromImageData(imageData, { x: 0, y: 0, width: square.width, height: square.height })
    );
  }
</script>

<video bind:this={videoElement} class="runtime-media" muted playsinline aria-hidden="true"></video>
<canvas bind:this={canvasElement} class="runtime-media" aria-hidden="true"></canvas>

<style>
  .runtime-media {
    position: fixed;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
</style>
