<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { cameraDetector, type CameraDetectorState } from './detector-store';
  import { averageRgbFromImageData, clampSquare } from './detection';
  import { getTransitionFunctionNames } from './transition-actions';
  import { refreshCameraDevices, startCamera, stopCamera } from './camera-actions';
  import { playDetectorBeep } from './sound';

  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let animationFrame = 0;
  let unsubscribe: (() => void) | undefined;
  let attachedStream: MediaStream | null = null;
  let fpsWindowStart = 0;
  let fpsFrameCount = 0;
  let previousPointStates: Record<string, boolean> | null = null;

  onMount(() => {
    cameraDetector.hydrate();
    void initializeCamera();

    unsubscribe = cameraDetector.subscribe((state) => {
      attachStream(state.stream);
      runTransitionActions(state);
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
    const sampled = sampleCurrentPoints();
    updateFps(sampled);
    animationFrame = requestAnimationFrame(sampleLoop);
  }

  function sampleCurrentPoints(): boolean {
    const currentState = get(cameraDetector);
    const videoWidth = videoElement?.videoWidth ?? 0;
    const videoHeight = videoElement?.videoHeight ?? 0;

    if (!currentState.stream) {
      return false;
    }

    if (!videoElement || !canvasElement || videoElement.readyState < 2 || !videoWidth || !videoHeight) {
      if (currentState.points.some((point) => point.currentRgb)) {
        cameraDetector.setPointCurrentRgbs(
          Object.fromEntries(currentState.points.map((point) => [point.id, null]))
        );
      }

      return false;
    }

    cameraDetector.setVideoSize(videoWidth, videoHeight);

    const state = get(cameraDetector);
    const context = canvasElement.getContext('2d', { willReadFrequently: true });

    if (!context) {
      cameraDetector.setPointCurrentRgbs(Object.fromEntries(state.points.map((point) => [point.id, null])));
      return false;
    }

    const samples = Object.fromEntries(
      state.points.map((point) => {
        if (!point.enabled) {
          return [point.id, null];
        }

        const square = clampSquare(point.square, videoWidth, videoHeight);
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
        return [
          point.id,
          averageRgbFromImageData(imageData, { x: 0, y: 0, width: square.width, height: square.height })
        ];
      })
    );

    cameraDetector.setPointCurrentRgbs(samples);
    return true;
  }

  function updateFps(sampled: boolean): void {
    const now = performance.now();

    if (!sampled) {
      fpsWindowStart = now;
      fpsFrameCount = 0;

      if (get(cameraDetector).fps !== 0) {
        cameraDetector.setFps(0);
      }

      return;
    }

    if (fpsWindowStart === 0) {
      fpsWindowStart = now;
    }

    fpsFrameCount += 1;

    const elapsed = now - fpsWindowStart;
    if (elapsed >= 1000) {
      cameraDetector.setFps((fpsFrameCount * 1000) / elapsed);
      fpsWindowStart = now;
      fpsFrameCount = 0;
    }
  }

  function runTransitionActions(state: CameraDetectorState): void {
    const transitionActions = getTransitionFunctionNames(previousPointStates, state);

    for (const functionName of transitionActions.functionNames) {
      runFunction(functionName, state);
    }

    previousPointStates = transitionActions.currentPointStates;
  }

  function runFunction(functionId: string | null, state: CameraDetectorState): void {
    if (!functionId) {
      return;
    }

    const action = state.functions.find((item) => item.id === functionId || item.name === functionId);
    if (action?.type === 'sound') {
      playDetectorBeep();
    }
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
