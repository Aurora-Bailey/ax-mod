<script lang="ts">
  import { onMount } from 'svelte';
  import { cameraDetector, type CameraDetectorState } from './detector-store';
  import { MAX_SENSITIVITY, MIN_SENSITIVITY, formatRgb, type DetectionSquare } from './detection';
  import { refreshCameraDevices, startCamera, stopCamera } from './camera-actions';
  import { unlockDetectorAudio } from './sound';

  type SquareKey = keyof DetectionSquare;

  const squareControls: Array<{ key: SquareKey; label: string }> = [
    { key: 'x', label: 'X' },
    { key: 'y', label: 'Y' },
    { key: 'width', label: 'Width' },
    { key: 'height', label: 'Height' }
  ];

  let videoElement: HTMLVideoElement;
  let localError = '';
  let attachedStream: MediaStream | null = null;

  $: attachVisibleStream($cameraDetector.stream);
  $: statusText = $cameraDetector.referenceRgb
    ? $cameraDetector.isMatch
      ? 'Match'
      : 'No match'
    : 'Train a reference';

  onMount(() => {
    attachVisibleStream($cameraDetector.stream);
    void refreshCameraDevices();
  });

  async function handleStartCamera(): Promise<void> {
    localError = '';
    await unlockDetectorAudio();
    await startCamera($cameraDetector.selectedDeviceId);
  }

  function handleStopCamera(): void {
    stopCamera();
  }

  function handleDeviceChange(event: Event): void {
    const selectedDeviceId = (event.currentTarget as HTMLSelectElement).value;
    cameraDetector.setSelectedDeviceId(selectedDeviceId);
  }

  async function handleTrain(): Promise<void> {
    localError = '';
    await unlockDetectorAudio();

    if (!cameraDetector.trainFromCurrent()) {
      localError = 'Start a camera before training.';
    }
  }

  function updateSquareValue(key: SquareKey, value: number): void {
    cameraDetector.updateSquare({ [key]: value });
  }

  function updateSensitivity(value: number): void {
    cameraDetector.setSensitivity(value);
  }

  function attachVisibleStream(stream: MediaStream | null): void {
    if (!videoElement || attachedStream === stream) {
      return;
    }

    attachedStream = stream;
    videoElement.srcObject = stream;

    if (stream) {
      void videoElement.play();
    }
  }

  function updateVideoSize(): void {
    if (videoElement?.videoWidth && videoElement?.videoHeight) {
      cameraDetector.setVideoSize(videoElement.videoWidth, videoElement.videoHeight);
    }
  }

  function maxForControl(state: CameraDetectorState, key: SquareKey): number {
    if (key === 'x' || key === 'width') {
      return state.videoWidth;
    }

    return state.videoHeight;
  }

  function minForControl(key: SquareKey): number {
    return key === 'width' || key === 'height' ? 1 : 0;
  }

  function squareStyle(state: CameraDetectorState): string {
    const videoWidth = Math.max(1, state.videoWidth);
    const videoHeight = Math.max(1, state.videoHeight);

    return [
      `left: ${(state.square.x / videoWidth) * 100}%`,
      `top: ${(state.square.y / videoHeight) * 100}%`,
      `width: ${(state.square.width / videoWidth) * 100}%`,
      `height: ${(state.square.height / videoHeight) * 100}%`
    ].join('; ');
  }
</script>

<section class="camera-page" aria-labelledby="camera-title">
  <div class="page-heading">
    <p class="eyebrow">Camera</p>
    <h1 id="camera-title">Color detector</h1>
  </div>

  <section class="camera-panel" aria-label="Camera detector">
    <div class="video-frame">
      {#if !$cameraDetector.cameraActive}
        <div class="video-placeholder">
          <p>Select a webcam and start the camera.</p>
        </div>
      {/if}

      <video
        bind:this={videoElement}
        class:hidden={!$cameraDetector.cameraActive}
        muted
        playsinline
        onloadedmetadata={updateVideoSize}
      ></video>

      {#if $cameraDetector.cameraActive}
        <div
          class:match={$cameraDetector.isMatch}
          class="detection-square"
          style={squareStyle($cameraDetector)}
          aria-label={statusText}
        ></div>
      {/if}
    </div>

    <div class="status-row">
      <div>
        <span class="status-label">Status</span>
        <strong class:match-text={$cameraDetector.isMatch}>{statusText}</strong>
      </div>
      <div>
        <span class="status-label">Current RGB</span>
        <strong>{formatRgb($cameraDetector.currentRgb)}</strong>
      </div>
      <div>
        <span class="status-label">Reference RGB</span>
        <strong>{formatRgb($cameraDetector.referenceRgb)}</strong>
      </div>
      <div>
        <span class="status-label">Lab distance</span>
        <strong>
          {$cameraDetector.distance === null ? 'Not trained' : $cameraDetector.distance.toFixed(2)}
        </strong>
      </div>
    </div>

    {#if $cameraDetector.cameraError || localError}
      <p class="error" role="alert">{$cameraDetector.cameraError || localError}</p>
    {/if}

    <section class="settings" aria-label="Camera settings">
      <div class="setting-row">
        <label for="camera-device">Webcam</label>
        <div class="inline-controls">
          <select
            id="camera-device"
            value={$cameraDetector.selectedDeviceId}
            onchange={handleDeviceChange}
          >
            <option value="">Default camera</option>
            {#each $cameraDetector.devices as device}
              <option value={device.deviceId}>{device.label}</option>
            {/each}
          </select>
          <button type="button" onclick={refreshCameraDevices}>Refresh</button>
          <button type="button" onclick={handleStartCamera}>Start</button>
          <button type="button" onclick={handleStopCamera} disabled={!$cameraDetector.cameraActive}>
            Stop
          </button>
        </div>
      </div>

      <div class="setting-row">
        <label for="sensitivity">Sensitivity</label>
        <div class="range-pair">
          <input
            id="sensitivity"
            type="range"
            min={MIN_SENSITIVITY}
            max={MAX_SENSITIVITY}
            value={$cameraDetector.sensitivity}
            oninput={(event) => updateSensitivity(event.currentTarget.valueAsNumber)}
          />
          <input
            aria-label="Sensitivity value"
            type="number"
            min={MIN_SENSITIVITY}
            max={MAX_SENSITIVITY}
            value={$cameraDetector.sensitivity}
            oninput={(event) => updateSensitivity(event.currentTarget.valueAsNumber)}
          />
        </div>
      </div>

      <div class="square-grid">
        {#each squareControls as control}
          <div class="setting-row compact">
            <label for={`square-${control.key}`}>{control.label}</label>
            <div class="range-pair">
              <input
                id={`square-${control.key}`}
                type="range"
                min={minForControl(control.key)}
                max={maxForControl($cameraDetector, control.key)}
                value={$cameraDetector.square[control.key]}
                oninput={(event) => updateSquareValue(control.key, event.currentTarget.valueAsNumber)}
              />
              <input
                aria-label={`${control.label} value`}
                type="number"
                min={minForControl(control.key)}
                max={maxForControl($cameraDetector, control.key)}
                value={$cameraDetector.square[control.key]}
                oninput={(event) => updateSquareValue(control.key, event.currentTarget.valueAsNumber)}
              />
            </div>
          </div>
        {/each}
      </div>

      <div class="actions">
        <button type="button" class="train-button" onclick={handleTrain}>Train reference</button>
        <button
          type="button"
          class="secondary"
          onclick={() => cameraDetector.resetReference()}
          disabled={!$cameraDetector.referenceRgb}
        >
          Clear reference
        </button>
      </div>
    </section>
  </section>
</section>

<style>
  .camera-page {
    width: min(100%, 980px);
    margin: 0 auto;
  }

  .page-heading {
    margin-bottom: 20px;
  }

  .eyebrow {
    margin: 0 0 8px;
    color: #47624f;
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: 2.35rem;
    line-height: 1.05;
  }

  .camera-panel {
    border: 1px solid rgba(31, 41, 51, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 18px 60px rgba(31, 41, 51, 0.13);
    overflow: hidden;
  }

  .video-frame {
    position: relative;
    display: grid;
    min-height: 280px;
    background: #111827;
  }

  video {
    width: 100%;
    height: auto;
    display: block;
  }

  .hidden {
    display: none;
  }

  .video-placeholder {
    min-height: 360px;
    display: grid;
    place-items: center;
    padding: 24px;
    color: #d7dee7;
    text-align: center;
  }

  .video-placeholder p {
    margin: 0;
  }

  .detection-square {
    position: absolute;
    border: 3px solid #dc2626;
    background: rgba(220, 38, 38, 0.12);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.36);
    pointer-events: none;
  }

  .detection-square.match {
    border-color: #16a34a;
    background: rgba(22, 163, 74, 0.16);
  }

  .status-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    padding: 18px;
    border-bottom: 1px solid rgba(31, 41, 51, 0.1);
  }

  .status-row div {
    min-width: 0;
  }

  .status-label {
    display: block;
    margin-bottom: 4px;
    color: #5d6670;
    font-size: 0.78rem;
    font-weight: 750;
    text-transform: uppercase;
  }

  strong {
    overflow-wrap: anywhere;
  }

  .match-text {
    color: #12803a;
  }

  .error {
    margin: 0;
    padding: 14px 18px 0;
    color: #9f1d20;
    font-weight: 750;
  }

  .settings {
    display: grid;
    gap: 18px;
    padding: 18px;
  }

  .setting-row {
    display: grid;
    gap: 8px;
  }

  label {
    font-weight: 800;
  }

  .inline-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    gap: 10px;
  }

  select,
  input,
  button {
    min-height: 42px;
    border-radius: 6px;
  }

  select,
  input {
    width: 100%;
    border: 1px solid #b9c2b4;
    background: #fff;
    color: #1f2933;
    padding: 0 12px;
  }

  input[type='range'] {
    padding: 0;
  }

  input[type='number'] {
    max-width: 110px;
  }

  button {
    border: 0;
    padding: 0 16px;
    background: #1f6f50;
    color: #fff;
    font-weight: 800;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: #185c42;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  .secondary {
    background: #2d4f73;
  }

  .secondary:hover:not(:disabled) {
    background: #253f5b;
  }

  .range-pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 110px;
    gap: 10px;
    align-items: center;
  }

  .square-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .train-button {
    min-width: 150px;
  }

  @media (max-width: 760px) {
    .status-row,
    .square-grid,
    .inline-controls {
      grid-template-columns: 1fr;
    }

    .range-pair {
      grid-template-columns: 1fr;
    }

    input[type='number'] {
      max-width: none;
    }

    h1 {
      font-size: 2rem;
    }
  }
</style>
