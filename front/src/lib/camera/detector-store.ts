import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { parseDetectionScript } from './detection-script';
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

export type DetectionFunction = {
  id: string;
  name: string;
  type: 'sound';
};

export type DetectionPoint = {
  id: string;
  name: string;
  enabled: boolean;
  square: DetectionSquare;
  sensitivity: number;
  referenceRgb: Rgb | null;
  referenceLab: Lab | null;
  currentRgb: Rgb | null;
  currentLab: Lab | null;
  distance: number | null;
  isMatch: boolean;
  onActionFunctionId: string | null;
  offActionFunctionId: string | null;
};

export type CameraDetectorState = {
  devices: CameraDevice[];
  selectedDeviceId: string;
  stream: MediaStream | null;
  cameraActive: boolean;
  cameraError: string;
  videoWidth: number;
  videoHeight: number;
  points: DetectionPoint[];
  functions: DetectionFunction[];
  script: string;
  scriptErrors: string[];
  fps: number;
  hydrated: boolean;
};

type PersistedDetectorState = {
  selectedDeviceId: string;
  points: PersistedDetectionPoint[];
  functions: DetectionFunction[];
  script: string;
};

type PersistedDetectionPoint = {
  id: string;
  name: string;
  enabled: boolean;
  square: DetectionSquare;
  sensitivity: number;
  referenceRgb: Rgb | null;
  referenceLab: Lab | null;
  onActionFunctionId: string | null;
  offActionFunctionId: string | null;
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
  points: [createDefaultPoint(1)],
  functions: [],
  script: '',
  scriptErrors: [],
  fps: 0,
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
          points: persisted.points.map((point) => ({
            ...point,
            square: clampSquare(point.square, state.videoWidth, state.videoHeight),
            sensitivity: clampSensitivity(point.sensitivity),
            currentRgb: null,
            currentLab: null,
            distance: null,
            isMatch: false
          })),
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
          fps: stream ? state.fps : 0,
          points: stream
            ? state.points
            : state.points.map((point) => ({ ...point, currentRgb: null, currentLab: null }))
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
          fps: deactivate ? 0 : state.fps,
          points: deactivate
            ? state.points.map((point) => ({ ...point, currentRgb: null, currentLab: null }))
            : state.points
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
          points: state.points.map((point) => ({
            ...point,
            square: clampSquare(point.square, videoWidth, videoHeight)
          }))
        }),
        false
      );
    },
    setFps(fps: number): void {
      updateAndPersist((state) => ({ ...state, fps: Math.max(0, Math.round(fps)) }), false);
    },
    addPoint(): void {
      updateAndPersist((state) => {
        const point = createDefaultPoint(nextNumberedName(state.points.map((item) => item.name), 'point'));

        return {
          ...state,
          points: [
            ...state.points,
            {
              ...point,
              square: clampSquare(point.square, state.videoWidth, state.videoHeight)
            }
          ]
        };
      });
    },
    setPointEnabled(pointId: string, enabled: boolean): void {
      updatePoint(pointId, (point) => ({ ...point, enabled }));
    },
    updatePointSquare(pointId: string, partial: Partial<DetectionSquare>): void {
      updateAndPersist((state) => ({
        ...state,
        points: state.points.map((point) =>
          point.id === pointId
            ? {
                ...point,
                square: clampSquare(
                  { ...point.square, ...partial },
                  state.videoWidth,
                  state.videoHeight
                )
              }
            : point
        )
      }));
    },
    setPointSensitivity(pointId: string, sensitivity: number): void {
      updatePoint(pointId, (point) => ({ ...point, sensitivity: clampSensitivity(sensitivity) }));
    },
    setPointAction(
      pointId: string,
      action: 'onActionFunctionId' | 'offActionFunctionId',
      functionId: string | null
    ): void {
      updatePoint(pointId, (point) => ({ ...point, [action]: functionId }));
    },
    setPointCurrentRgbs(samples: Record<string, Rgb | null>): void {
      updateAndPersist(
        (state) => ({
          ...state,
          points: state.points.map((point) => {
            if (!(point.id in samples)) {
              return point;
            }

            const currentRgb = samples[point.id] ?? null;
            return {
              ...point,
              currentRgb,
              currentLab: currentRgb ? rgbToLab(currentRgb) : null
            };
          })
        }),
        false
      );
    },
    trainPointFromCurrent(pointId: string): boolean {
      let trained = false;

      updateAndPersist((state) => ({
        ...state,
        points: state.points.map((point) => {
          if (point.id !== pointId || !point.currentRgb) {
            return point;
          }

          trained = true;
          return {
            ...point,
            referenceRgb: point.currentRgb,
            referenceLab: point.currentLab ?? rgbToLab(point.currentRgb)
          };
        })
      }));

      return trained;
    },
    resetPointReference(pointId: string): void {
      updatePoint(pointId, (point) => ({ ...point, referenceRgb: null, referenceLab: null }));
    },
    addFunction(): void {
      updateAndPersist((state) => {
        const nextNumber = nextNumberedName(state.functions.map((item) => item.name), 'sound');
        const nextFunction: DetectionFunction = {
          id: `sound${nextNumber}`,
          name: `sound${nextNumber}`,
          type: 'sound'
        };

        return {
          ...state,
          functions: [...state.functions, nextFunction]
        };
      });
    },
    setScript(script: string): void {
      updateAndPersist((state) => ({ ...state, script }));
    },
    resetForTests(): void {
      getStorage()?.removeItem(STORAGE_KEY);

      set(DEFAULT_STATE);
    }
  };

  function updatePoint(pointId: string, updater: (point: DetectionPoint) => DetectionPoint): void {
    updateAndPersist((state) => ({
      ...state,
      points: state.points.map((point) => (point.id === pointId ? updater(point) : point))
    }));
  }
}

export const cameraDetector = createCameraDetectorStore();

function withDetection(state: CameraDetectorState): CameraDetectorState {
  const points = state.points.map((point) => {
    const currentLab = point.currentLab ?? (point.currentRgb ? rgbToLab(point.currentRgb) : null);
    const referenceLab = point.referenceLab ?? (point.referenceRgb ? rgbToLab(point.referenceRgb) : null);
    const distance = currentLab && referenceLab ? labDistance(currentLab, referenceLab) : null;

    return {
      ...point,
      currentLab,
      referenceLab,
      distance,
      isMatch: point.enabled && isLabMatch(currentLab, referenceLab, point.sensitivity)
    };
  });
  const scriptErrors = parseDetectionScript(
    state.script,
    points.map((point) => point.name),
    state.functions.map((item) => item.name)
  ).errors;

  return {
    ...state,
    points,
    scriptErrors
  };
}

function readPersistedState(): PersistedDetectorState {
  const fallback: PersistedDetectorState = {
    selectedDeviceId: DEFAULT_STATE.selectedDeviceId,
    points: DEFAULT_STATE.points.map(toPersistedPoint),
    functions: DEFAULT_STATE.functions,
    script: DEFAULT_STATE.script
  };

  if (!browser) {
    return fallback;
  }

  try {
    const raw = getStorage()?.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedDetectorState> &
      Partial<LegacyPersistedDetectorState>;
    const points = Array.isArray(parsed.points)
      ? parsed.points.map(readPersistedPoint).filter((point): point is PersistedDetectionPoint => point !== null)
      : [migrateLegacyPoint(parsed)];

    return {
      selectedDeviceId: typeof parsed.selectedDeviceId === 'string' ? parsed.selectedDeviceId : '',
      points: points.length > 0 ? points : fallback.points,
      functions: Array.isArray(parsed.functions)
        ? parsed.functions.filter(isDetectionFunction)
        : fallback.functions,
      script: typeof parsed.script === 'string' ? parsed.script : fallback.script
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
    points: state.points.map(toPersistedPoint),
    functions: state.functions,
    script: state.script
  };

  storage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

function createDefaultPoint(index: number): DetectionPoint {
  return {
    id: `point${index}`,
    name: `point${index}`,
    enabled: true,
    square: DEFAULT_SQUARE,
    sensitivity: 100,
    referenceRgb: null,
    referenceLab: null,
    currentRgb: null,
    currentLab: null,
    distance: null,
    isMatch: false,
    onActionFunctionId: null,
    offActionFunctionId: null
  };
}

function toPersistedPoint(point: DetectionPoint): PersistedDetectionPoint {
  return {
    id: point.id,
    name: point.name,
    enabled: point.enabled,
    square: point.square,
    sensitivity: point.sensitivity,
    referenceRgb: point.referenceRgb,
    referenceLab: point.referenceLab,
    onActionFunctionId: point.onActionFunctionId,
    offActionFunctionId: point.offActionFunctionId
  };
}

function readPersistedPoint(value: unknown): PersistedDetectionPoint | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const point = value as Partial<PersistedDetectionPoint>;
  const referenceRgb = isRgb(point.referenceRgb) ? point.referenceRgb : null;

  if (typeof point.id !== 'string' || typeof point.name !== 'string' || !isSquare(point.square)) {
    return null;
  }

  return {
    id: point.id,
    name: point.name,
    enabled: point.enabled !== false,
    square: point.square,
    sensitivity: clampSensitivity(Number(point.sensitivity)),
    referenceRgb,
    referenceLab: referenceRgb
      ? isLab(point.referenceLab)
        ? point.referenceLab
        : rgbToLab(referenceRgb)
      : null,
    onActionFunctionId:
      typeof point.onActionFunctionId === 'string' ? point.onActionFunctionId : null,
    offActionFunctionId:
      typeof point.offActionFunctionId === 'string' ? point.offActionFunctionId : null
  };
}

type LegacyPersistedDetectorState = {
  square: DetectionSquare;
  sensitivity: number;
  referenceRgb: Rgb | null;
  referenceLab: Lab | null;
};

function migrateLegacyPoint(parsed: Partial<LegacyPersistedDetectorState>): PersistedDetectionPoint {
  const referenceRgb = isRgb(parsed.referenceRgb) ? parsed.referenceRgb : null;

  return {
    id: 'point1',
    name: 'point1',
    enabled: true,
    square: isSquare(parsed.square) ? parsed.square : DEFAULT_SQUARE,
    sensitivity: clampSensitivity(Number(parsed.sensitivity)),
    referenceRgb,
    referenceLab: referenceRgb
      ? isLab(parsed.referenceLab)
        ? parsed.referenceLab
        : rgbToLab(referenceRgb)
      : null,
    onActionFunctionId: null,
    offActionFunctionId: null
  };
}

function nextNumberedName(existingNames: string[], prefix: string): number {
  const existingNumbers = existingNames
    .map((name) => name.match(new RegExp(`^${prefix}(\\d+)$`))?.[1])
    .filter((value): value is string => value !== undefined)
    .map(Number);

  return existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
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

function isDetectionFunction(value: unknown): value is DetectionFunction {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    value.type === 'sound'
  );
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
