import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import {
  clampSensitivity,
  clampSquare,
  isLabMatch,
  labDistance,
  rgbToLab,
  type DetectionSquare,
  type Lab,
  type Rgb
} from './detection';

export type CameraDevice = {
  deviceId: string;
  label: string;
};

export type CameraDetectorState = {
  devices: CameraDevice[];
  selectedDeviceId: string;
  stream: MediaStream | null;
  cameraActive: boolean;
  cameraError: string;
  videoWidth: number;
  videoHeight: number;
  square: DetectionSquare;
  sensitivity: number;
  referenceRgb: Rgb | null;
  referenceLab: Lab | null;
  currentRgb: Rgb | null;
  currentLab: Lab | null;
  distance: number | null;
  isMatch: boolean;
  hydrated: boolean;
};

type PersistedDetectorState = {
  selectedDeviceId: string;
  square: DetectionSquare;
  sensitivity: number;
  referenceRgb: Rgb | null;
  referenceLab: Lab | null;
};

const STORAGE_KEY = 'ax-mod.camera-detector.v1';
const DEFAULT_SQUARE: DetectionSquare = {
  x: 20,
  y: 20,
  width: 50,
  height: 50
};

const DEFAULT_STATE: CameraDetectorState = {
  devices: [],
  selectedDeviceId: '',
  stream: null,
  cameraActive: false,
  cameraError: '',
  videoWidth: 640,
  videoHeight: 480,
  square: DEFAULT_SQUARE,
  sensitivity: 100,
  referenceRgb: null,
  referenceLab: null,
  currentRgb: null,
  currentLab: null,
  distance: null,
  isMatch: false,
  hydrated: false
};

function createCameraDetectorStore() {
  const store = writable<CameraDetectorState>(DEFAULT_STATE);
  const { subscribe, update, set } = store;

  function updateAndPersist(
    updater: (state: CameraDetectorState) => CameraDetectorState,
    shouldPersist = true
  ): void {
    update((state) => {
      const next = withDetection(updater(state));

      if (shouldPersist) {
        persistState(next);
      }

      return next;
    });
  }

  return {
    subscribe,
    hydrate(): void {
      if (!browser) {
        return;
      }

      update((state) => {
        if (state.hydrated) {
          return state;
        }

        const persisted = readPersistedState();
        const next = withDetection({
          ...state,
          ...persisted,
          square: clampSquare(persisted.square, state.videoWidth, state.videoHeight),
          sensitivity: clampSensitivity(persisted.sensitivity),
          hydrated: true
        });

        persistState(next);
        return next;
      });
    },
    setDevices(devices: CameraDevice[]): void {
      updateAndPersist((state) => ({ ...state, devices, cameraError: '' }), false);
    },
    setSelectedDeviceId(selectedDeviceId: string): void {
      updateAndPersist((state) => ({ ...state, selectedDeviceId }));
    },
    setStream(stream: MediaStream | null): void {
      updateAndPersist(
        (state) => ({
          ...state,
          stream,
          cameraActive: stream !== null,
          cameraError: stream ? '' : state.cameraError,
          currentRgb: stream ? state.currentRgb : null,
          currentLab: stream ? state.currentLab : null
        }),
        false
      );
    },
    setCameraError(cameraError: string, options: { deactivate?: boolean } = {}): void {
      const deactivate = options.deactivate ?? true;
      updateAndPersist(
        (state) => ({
          ...state,
          cameraError,
          cameraActive: deactivate ? false : state.cameraActive,
          stream: deactivate ? null : state.stream,
          currentRgb: deactivate ? null : state.currentRgb,
          currentLab: deactivate ? null : state.currentLab
        }),
        false
      );
    },
    setVideoSize(videoWidth: number, videoHeight: number): void {
      updateAndPersist(
        (state) => ({
          ...state,
          videoWidth: Math.max(1, Math.round(videoWidth)),
          videoHeight: Math.max(1, Math.round(videoHeight)),
          square: clampSquare(state.square, videoWidth, videoHeight)
        }),
        false
      );
    },
    updateSquare(partial: Partial<DetectionSquare>): void {
      updateAndPersist((state) => ({
        ...state,
        square: clampSquare({ ...state.square, ...partial }, state.videoWidth, state.videoHeight)
      }));
    },
    setSensitivity(sensitivity: number): void {
      updateAndPersist((state) => ({ ...state, sensitivity: clampSensitivity(sensitivity) }));
    },
    setCurrentRgb(currentRgb: Rgb | null): void {
      updateAndPersist(
        (state) => ({
          ...state,
          currentRgb,
          currentLab: currentRgb ? rgbToLab(currentRgb) : null
        }),
        false
      );
    },
    trainFromCurrent(): boolean {
      let trained = false;

      updateAndPersist((state) => {
        if (!state.currentRgb) {
          return state;
        }

        trained = true;
        return {
          ...state,
          referenceRgb: state.currentRgb,
          referenceLab: state.currentLab ?? rgbToLab(state.currentRgb)
        };
      });

      return trained;
    },
    resetReference(): void {
      updateAndPersist((state) => ({ ...state, referenceRgb: null, referenceLab: null }));
    },
    resetForTests(): void {
      getStorage()?.removeItem(STORAGE_KEY);

      set(DEFAULT_STATE);
    }
  };
}

export const cameraDetector = createCameraDetectorStore();

function withDetection(state: CameraDetectorState): CameraDetectorState {
  const currentLab = state.currentLab ?? (state.currentRgb ? rgbToLab(state.currentRgb) : null);
  const referenceLab = state.referenceLab ?? (state.referenceRgb ? rgbToLab(state.referenceRgb) : null);
  const distance = currentLab && referenceLab ? labDistance(currentLab, referenceLab) : null;

  return {
    ...state,
    currentLab,
    referenceLab,
    distance,
    isMatch: isLabMatch(currentLab, referenceLab, state.sensitivity)
  };
}

function readPersistedState(): PersistedDetectorState {
  const fallback: PersistedDetectorState = {
    selectedDeviceId: DEFAULT_STATE.selectedDeviceId,
    square: DEFAULT_STATE.square,
    sensitivity: DEFAULT_STATE.sensitivity,
    referenceRgb: DEFAULT_STATE.referenceRgb,
    referenceLab: DEFAULT_STATE.referenceLab
  };

  if (!browser) {
    return fallback;
  }

  try {
    const raw = getStorage()?.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedDetectorState>;
    const referenceRgb = isRgb(parsed.referenceRgb) ? parsed.referenceRgb : null;

    return {
      selectedDeviceId: typeof parsed.selectedDeviceId === 'string' ? parsed.selectedDeviceId : '',
      square: isSquare(parsed.square) ? parsed.square : DEFAULT_SQUARE,
      sensitivity: clampSensitivity(Number(parsed.sensitivity)),
      referenceRgb,
      referenceLab: referenceRgb
        ? isLab(parsed.referenceLab)
          ? parsed.referenceLab
          : rgbToLab(referenceRgb)
        : null
    };
  } catch {
    return fallback;
  }
}

function persistState(state: CameraDetectorState): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const persisted: PersistedDetectorState = {
    selectedDeviceId: state.selectedDeviceId,
    square: state.square,
    sensitivity: state.sensitivity,
    referenceRgb: state.referenceRgb,
    referenceLab: state.referenceLab
  };

  storage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

function getStorage(): Storage | null {
  if (
    !browser ||
    typeof localStorage === 'undefined' ||
    typeof localStorage.getItem !== 'function' ||
    typeof localStorage.setItem !== 'function' ||
    typeof localStorage.removeItem !== 'function'
  ) {
    return null;
  }

  return localStorage;
}

function isSquare(value: unknown): value is DetectionSquare {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    'width' in value &&
    'height' in value
  );
}

function isRgb(value: unknown): value is Rgb {
  return (
    typeof value === 'object' &&
    value !== null &&
    'r' in value &&
    'g' in value &&
    'b' in value &&
    isFiniteNumber(value.r) &&
    isFiniteNumber(value.g) &&
    isFiniteNumber(value.b)
  );
}

function isLab(value: unknown): value is Lab {
  return (
    typeof value === 'object' &&
    value !== null &&
    'l' in value &&
    'a' in value &&
    'b' in value &&
    isFiniteNumber(value.l) &&
    isFiniteNumber(value.a) &&
    isFiniteNumber(value.b)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
