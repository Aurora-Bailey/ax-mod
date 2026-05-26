<script lang="ts">
  import { onMount } from 'svelte';
  import {
    cameraDetector,
    type CameraDetectorState,
    type DetectionPoint
  } from './detector-store';
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
  let openPointId = 'point1';

  $: attachVisibleStream($cameraDetector.stream);
  $: if (!$cameraDetector.points.some((point) => point.id === openPointId)) {
    openPointId = $cameraDetector.points[0]?.id ?? '';
  }

  onMount(() => {
    attachVisibleStream($cameraDetector.stream);
    void refreshCameraDevices();
  });

  async function handleToggleCamera(): Promise<void> {
    localError = '';

    if ($cameraDetector.cameraActive) {
      stopCamera();
      return;
    }

    await unlockDetectorAudio();
    await startCamera($cameraDetector.selectedDeviceId);
  }

  function handleDeviceChange(event: Event): void {
    const selectedDeviceId = (event.currentTarget as HTMLSelectElement).value;
    cameraDetector.setSelectedDeviceId(selectedDeviceId);
  }

  async function handleTrain(pointId: string): Promise<void> {
    localError = '';
    await unlockDetectorAudio();

    if (!cameraDetector.trainPointFromCurrent(pointId)) {
      localError = 'Start a camera before training.';
    }
  }

  function updateSquareValue(pointId: string, key: SquareKey, value: number): void {
    cameraDetector.updatePointSquare(pointId, { [key]: value });
  }

  function updateSensitivity(pointId: string, value: number): void {
    cameraDetector.setPointSensitivity(pointId, value);
  }

  function updateAction(
    pointId: string,
    action: 'onActionFunctionId' | 'offActionFunctionId',
    value: string
  ): void {
    cameraDetector.setPointAction(pointId, action, value || null);
  }

  function handleAddPoint(): void {
    openPointId = nextPointId();
    cameraDetector.addPoint();
  }

  function togglePoint(pointId: string): void {
    openPointId = openPointId === pointId ? '' : pointId;
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

  function pointStyle(state: CameraDetectorState, point: DetectionPoint): string {
    const videoWidth = Math.max(1, state.videoWidth);
    const videoHeight = Math.max(1, state.videoHeight);

    return [
      `left: ${(point.square.x / videoWidth) * 100}%`,
      `top: ${(point.square.y / videoHeight) * 100}%`,
      `width: ${(point.square.width / videoWidth) * 100}%`,
      `height: ${(point.square.height / videoHeight) * 100}%`
    ].join('; ');
  }

  function pointStateText(point: DetectionPoint): string {
    if (!point.enabled) {
      return 'Disabled';
    }

    if (!point.referenceRgb) {
      return 'Untrained';
    }

    return point.isMatch ? 'On' : 'Off';
  }

  function nextPointId(): string {
    const nextNumber =
      Math.max(
        0,
        ...$cameraDetector.points
          .map((point) => point.name.match(/^point(\d+)$/)?.[1])
          .filter((value): value is string => value !== undefined)
          .map(Number)
      ) + 1;

    return `point${nextNumber}`;
  }
</script>

<section class="camera-page" aria-labelledby="camera-title">
  <div class="page-heading">
    <p class="eyebrow">Camera</p>
    <h1 id="camera-title">Color detector</h1>
  </div>

  <section class="camera-panel" aria-label="Camera detector">
    <section class="camera-toolbar" aria-label="Camera controls">
      <div class="device-field">
        <label for="camera-device">Webcam</label>
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
      </div>

      <button
        type="button"
        class="icon-button"
        aria-label="Refresh cameras"
        title="Refresh cameras"
        onclick={refreshCameraDevices}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 6v5h-5" />
          <path d="M4 18v-5h5" />
          <path d="M17.7 8.3A7 7 0 0 0 6.1 7.2L4 9.2" />
          <path d="M6.3 15.7a7 7 0 0 0 11.6 1.1l2.1-2" />
        </svg>
      </button>

      <button
        type="button"
        class="icon-button"
        aria-label={$cameraDetector.cameraActive ? 'Stop camera' : 'Start camera'}
        title={$cameraDetector.cameraActive ? 'Stop camera' : 'Start camera'}
        onclick={handleToggleCamera}
      >
        {#if $cameraDetector.cameraActive}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="7" width="10" height="10" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        {/if}
      </button>

      <span class="fps-readout">FPS: {$cameraDetector.fps}</span>
    </section>

    {#if $cameraDetector.cameraError || localError}
      <p class="error" role="alert">{$cameraDetector.cameraError || localError}</p>
    {/if}

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
        {#each $cameraDetector.points as point (point.id)}
          {#if point.enabled}
            <div
              class:match={point.isMatch}
              class="detection-square"
              style={pointStyle($cameraDetector, point)}
              aria-label={`${point.name} ${pointStateText(point)}`}
            >
              <span>{point.name}</span>
            </div>
          {/if}
        {/each}
      {/if}
    </div>

    <section class="detection-section" aria-labelledby="detection-points-title">
      <div class="section-header">
        <h2 id="detection-points-title">Detection points</h2>
        <button type="button" class="compact-button" onclick={handleAddPoint}>
          Add point
        </button>
      </div>

      <div class="point-list">
        {#each $cameraDetector.points as point (point.id)}
          <section class="point-panel" aria-labelledby={`${point.id}-header`}>
            <button
              type="button"
              class="accordion-trigger"
              aria-expanded={openPointId === point.id}
              aria-controls={`${point.id}-settings`}
              onclick={() => togglePoint(point.id)}
            >
              <span class="point-title">{point.name}</span>
              <span class:match-text={point.isMatch} class="point-state">{pointStateText(point)}</span>
              <span class="point-meta">
                {point.distance === null ? 'Not trained' : `Lab ${point.distance.toFixed(2)}`}
              </span>
              <span class="accordion-action" id={`${point.id}-header`}>
                Settings
                <svg
                  class:open={openPointId === point.id}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            {#if openPointId === point.id}
            <div class="point-settings" id={`${point.id}-settings`}>
              <label class="checkbox-row">
                <input
                  type="checkbox"
                  checked={point.enabled}
                  onchange={(event) =>
                    cameraDetector.setPointEnabled(point.id, event.currentTarget.checked)}
                />
                Enabled
              </label>

              <div class="status-row">
                <div>
                  <span class="status-label">Current RGB</span>
                  <strong>{formatRgb(point.currentRgb)}</strong>
                </div>
                <div>
                  <span class="status-label">Reference RGB</span>
                  <strong>{formatRgb(point.referenceRgb)}</strong>
                </div>
                <div>
                  <span class="status-label">Lab distance</span>
                  <strong>{point.distance === null ? 'Not trained' : point.distance.toFixed(2)}</strong>
                </div>
              </div>

              <div class="setting-row">
                <label for={`sensitivity-${point.id}`}>Sensitivity</label>
                <div class="range-pair">
                  <input
                    id={`sensitivity-${point.id}`}
                    type="range"
                    min={MIN_SENSITIVITY}
                    max={MAX_SENSITIVITY}
                    value={point.sensitivity}
                    oninput={(event) => updateSensitivity(point.id, event.currentTarget.valueAsNumber)}
                  />
                  <input
                    aria-label={`${point.name} sensitivity value`}
                    type="number"
                    min={MIN_SENSITIVITY}
                    max={MAX_SENSITIVITY}
                    value={point.sensitivity}
                    oninput={(event) => updateSensitivity(point.id, event.currentTarget.valueAsNumber)}
                  />
                </div>
              </div>

              <div class="square-grid">
                {#each squareControls as control}
                  <div class="setting-row compact">
                    <label for={`${point.id}-${control.key}`}>{control.label}</label>
                    <div class="range-pair">
                      <input
                        id={`${point.id}-${control.key}`}
                        type="range"
                        min={minForControl(control.key)}
                        max={maxForControl($cameraDetector, control.key)}
                        value={point.square[control.key]}
                        oninput={(event) =>
                          updateSquareValue(point.id, control.key, event.currentTarget.valueAsNumber)}
                      />
                      <input
                        aria-label={`${point.name} ${control.label} value`}
                        type="number"
                        min={minForControl(control.key)}
                        max={maxForControl($cameraDetector, control.key)}
                        value={point.square[control.key]}
                        oninput={(event) =>
                          updateSquareValue(point.id, control.key, event.currentTarget.valueAsNumber)}
                      />
                    </div>
                  </div>
                {/each}
              </div>

              <div class="action-grid">
                <div class="setting-row">
                  <label for={`${point.id}-on-action`}>On action</label>
                  <select
                    id={`${point.id}-on-action`}
                    value={point.onActionFunctionId ?? ''}
                    onchange={(event) =>
                      updateAction(point.id, 'onActionFunctionId', event.currentTarget.value)}
                  >
                    <option value="">None</option>
                    {#each $cameraDetector.functions as action}
                      <option value={action.id}>{action.name}</option>
                    {/each}
                  </select>
                </div>
                <div class="setting-row">
                  <label for={`${point.id}-off-action`}>Off action</label>
                  <select
                    id={`${point.id}-off-action`}
                    value={point.offActionFunctionId ?? ''}
                    onchange={(event) =>
                      updateAction(point.id, 'offActionFunctionId', event.currentTarget.value)}
                  >
                    <option value="">None</option>
                    {#each $cameraDetector.functions as action}
                      <option value={action.id}>{action.name}</option>
                    {/each}
                  </select>
                </div>
              </div>

              <div class="actions">
                <button type="button" class="train-button" onclick={() => handleTrain(point.id)}>
                  Train reference
                </button>
                <button
                  type="button"
                  class="secondary"
                  onclick={() => cameraDetector.resetPointReference(point.id)}
                  disabled={!point.referenceRgb}
                >
                  Clear reference
                </button>
              </div>
            </div>
            {/if}
          </section>
        {/each}
      </div>
    </section>

    <section class="function-section" aria-labelledby="functions-title">
      <div class="section-header">
        <h2 id="functions-title">Functions</h2>
        <button type="button" class="compact-button" onclick={() => cameraDetector.addFunction()}>
          Add sound
        </button>
      </div>

      {#if $cameraDetector.functions.length === 0}
        <p class="empty-state">No functions added.</p>
      {:else}
        <ul class="function-list">
          {#each $cameraDetector.functions as action}
            <li>
              <span>{action.name}</span>
              <span>{action.type}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="script-section" aria-labelledby="script-title">
      <div class="section-header">
        <h2 id="script-title">Script</h2>
      </div>

      <textarea
        aria-label="Detection script"
        spellcheck="false"
        value={$cameraDetector.script}
        oninput={(event) => cameraDetector.setScript(event.currentTarget.value)}
      ></textarea>

      {#if $cameraDetector.scriptErrors.length > 0}
        <ul class="script-errors" aria-label="Script errors">
          {#each $cameraDetector.scriptErrors as error}
            <li>{error}</li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="dev-guide-section" aria-labelledby="dev-guide-title">
      <div class="section-header">
        <h2 id="dev-guide-title">Coding dev guide</h2>
      </div>

      <div class="guide-grid">
        <div>
          <h3>Points</h3>
          <p>
            Detection points are named <code>point1</code>, <code>point2</code>, and so on. Each
            point owns its own square, sensitivity, trained Lab reference, and on/off transition.
          </p>
        </div>
        <div>
          <h3>Functions</h3>
          <p>
            Sound functions are named <code>sound1</code>, <code>sound2</code>, and so on.
            <code>FUNCTION null</code> is a no-op branch for script logic.
          </p>
        </div>
        <div>
          <h3>Script</h3>
          <pre>ONACTION point1 | point1 IS TRUE ? FUNCTION sound1 : FUNCTION null</pre>
          <p>
            Conditions support <code>IS TRUE</code>, <code>IS FALSE</code>, <code>AND</code>, and
            <code>OR</code>. Rules run only when the named <code>ONACTION</code> point changes.
          </p>
        </div>
      </div>
    </section>
  </section>
</section>

<style>
  .camera-page {
    width: min(100%, 1060px);
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

  h1,
  h2 {
    margin: 0;
    line-height: 1.05;
  }

  h1 {
    font-size: 2.35rem;
  }

  h2 {
    font-size: 1.05rem;
  }

  .camera-panel {
    border: 1px solid rgba(31, 41, 51, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 18px 60px rgba(31, 41, 51, 0.13);
    overflow: hidden;
  }

  .camera-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    gap: 10px;
    align-items: end;
    padding: 16px;
    border-bottom: 1px solid rgba(31, 41, 51, 0.1);
  }

  .device-field,
  .setting-row {
    display: grid;
    gap: 8px;
  }

  label {
    font-weight: 800;
  }

  select,
  input,
  button,
  textarea {
    border-radius: 6px;
  }

  select,
  input,
  textarea {
    width: 100%;
    border: 1px solid #b9c2b4;
    background: #fff;
    color: #1f2933;
  }

  select,
  input,
  button {
    min-height: 42px;
  }

  select,
  input {
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

  .icon-button {
    width: 42px;
    padding: 0;
    display: grid;
    place-items: center;
  }

  .icon-button svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .icon-button rect {
    fill: currentColor;
    stroke: none;
  }

  .icon-button path[d='M8 5v14l11-7z'] {
    fill: currentColor;
    stroke: none;
  }

  .fps-readout {
    min-height: 42px;
    display: inline-grid;
    align-items: center;
    color: #40505f;
    font-weight: 850;
    white-space: nowrap;
  }

  .error {
    margin: 0;
    padding: 14px 18px 0;
    color: #9f1d20;
    font-weight: 750;
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

  .detection-square span {
    position: absolute;
    left: -3px;
    bottom: calc(100% + 3px);
    padding: 2px 6px;
    background: rgba(17, 24, 39, 0.88);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 850;
    white-space: nowrap;
  }

  .detection-section,
  .function-section,
  .script-section,
  .dev-guide-section {
    display: grid;
    gap: 14px;
    padding: 18px;
    border-top: 1px solid rgba(31, 41, 51, 0.1);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .compact-button {
    min-height: 36px;
  }

  .point-list {
    display: grid;
    gap: 12px;
  }

  .point-panel {
    border: 1px solid rgba(31, 41, 51, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.78);
  }

  .accordion-trigger {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    gap: 12px;
    align-items: center;
    min-height: 0;
    padding: 14px;
    border: 0;
    background: transparent;
    color: #1f2933;
    cursor: pointer;
    text-align: left;
  }

  .accordion-trigger:hover:not(:disabled) {
    background: rgba(31, 111, 80, 0.08);
  }

  .point-title,
  .point-state {
    font-weight: 850;
  }

  .point-meta {
    color: #5d6670;
    font-weight: 750;
  }

  .accordion-action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #1f6f50;
    font-weight: 850;
  }

  .accordion-action svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 140ms ease;
  }

  .accordion-action svg.open {
    transform: rotate(180deg);
  }

  .point-settings {
    display: grid;
    gap: 16px;
    padding: 0 14px 14px;
  }

  .checkbox-row {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    width: fit-content;
  }

  .checkbox-row input {
    width: 18px;
    min-height: 18px;
  }

  .status-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
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

  .range-pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 110px;
    gap: 10px;
    align-items: center;
  }

  .square-grid,
  .action-grid {
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

  .secondary {
    background: #2d4f73;
  }

  .secondary:hover:not(:disabled) {
    background: #253f5b;
  }

  .empty-state {
    margin: 0;
    color: #5d6670;
  }

  .function-list,
  .script-errors {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .function-list {
    display: grid;
    gap: 8px;
  }

  .function-list li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid rgba(31, 41, 51, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.72);
    font-weight: 800;
  }

  textarea {
    min-height: 128px;
    padding: 12px;
    font: inherit;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    line-height: 1.4;
    resize: vertical;
  }

  .script-errors {
    display: grid;
    gap: 6px;
    color: #9f1d20;
    font-weight: 750;
  }

  .guide-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .guide-grid h3 {
    margin: 0 0 8px;
    font-size: 0.95rem;
  }

  .guide-grid p {
    margin: 0;
    color: #40505f;
    line-height: 1.5;
  }

  code,
  pre {
    border-radius: 6px;
    background: rgba(31, 41, 51, 0.08);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  }

  code {
    padding: 1px 4px;
  }

  pre {
    margin: 0 0 8px;
    overflow-x: auto;
    padding: 10px;
    color: #1f2933;
    font-size: 0.85rem;
    line-height: 1.45;
  }

  @media (max-width: 760px) {
    .camera-toolbar,
    .status-row,
    .square-grid,
    .action-grid,
    .accordion-trigger,
    .guide-grid,
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
