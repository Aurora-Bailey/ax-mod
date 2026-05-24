import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import {
  clampSensitivity,
  clampSquare,
  isRgbMatch,
  rgbDistance,
  type DetectionSquare,
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
  currentRgb: Rgb | null;
  distance: number | null;
  isMatch: boolean;
  hydrated: boolean;
};

type PersistedDetectorState = {
  selectedDeviceId: string;
  square: DetectionSquare;
  sensitivity: number;
  referenceRgb: Rgb | null;
};

const STORAGE_KEY = 'ax-mod.camera-detector.v1';
const DEFAULT_SQUARE: DetectionSquare = {
  x: 20,
  y: 20,
  width: 120,
  height: 120
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
  currentRgb: null,
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
      updateAndPersist((state) => ({ ...state, devices }), false);
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
          currentRgb: stream ? state.currentRgb : null
        }),
        false
      );
    },
    setCameraError(cameraError: string): void {
      updateAndPersist(
        (state) => ({ ...state, cameraError, cameraActive: false, currentRgb: null }),
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
      updateAndPersist((state) => ({ ...state, currentRgb }), false);
    },
    trainFromCurrent(): boolean {
      let trained = false;

      updateAndPersist((state) => {
        if (!state.currentRgb) {
          return state;
        }

        trained = true;
        return { ...state, referenceRgb: state.currentRgb };
      });

      return trained;
    },
    resetReference(): void {
      updateAndPersist((state) => ({ ...state, referenceRgb: null }));
    },
    resetForTests(): void {
      getStorage()?.removeItem(STORAGE_KEY);

      set(DEFAULT_STATE);
    }
  };
}

export const cameraDetector = createCameraDetectorStore();

function withDetection(state: CameraDetectorState): CameraDetectorState {
  const distance =
    state.currentRgb && state.referenceRgb ? rgbDistance(state.currentRgb, state.referenceRgb) : null;

  return {
    ...state,
    distance,
    isMatch: isRgbMatch(state.currentRgb, state.referenceRgb, state.sensitivity)
  };
}

function readPersistedState(): PersistedDetectorState {
  const fallback: PersistedDetectorState = {
    selectedDeviceId: DEFAULT_STATE.selectedDeviceId,
    square: DEFAULT_STATE.square,
    sensitivity: DEFAULT_STATE.sensitivity,
    referenceRgb: DEFAULT_STATE.referenceRgb
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

    return {
      selectedDeviceId: typeof parsed.selectedDeviceId === 'string' ? parsed.selectedDeviceId : '',
      square: isSquare(parsed.square) ? parsed.square : DEFAULT_SQUARE,
      sensitivity: clampSensitivity(Number(parsed.sensitivity)),
      referenceRgb: isRgb(parsed.referenceRgb) ? parsed.referenceRgb : null
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
    referenceRgb: state.referenceRgb
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
    'b' in value
  );
}
