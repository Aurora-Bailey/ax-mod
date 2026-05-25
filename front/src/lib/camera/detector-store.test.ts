import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cameraDetector } from './detector-store';
import { rgbToLab } from './detection';

const STORAGE_KEY = 'ax-mod.camera-detector.v1';

describe('camera detector store', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    const mockStorage: Storage = {
      get length() {
        return storage.size;
      },
      clear: () => storage.clear(),
      getItem: (key) => storage.get(key) ?? null,
      key: (index) => Array.from(storage.keys())[index] ?? null,
      removeItem: (key) => {
        storage.delete(key);
      },
      setItem: (key, value) => {
        storage.set(key, value);
      }
    };

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: mockStorage
    });
  });

  afterEach(() => {
    cameraDetector.resetForTests();
  });

  it('uses a 50 by 50 square by default', () => {
    expect(get(cameraDetector).square).toMatchObject({
      width: 50,
      height: 50
    });
  });

  it('clamps square updates to the active video size', () => {
    cameraDetector.setVideoSize(100, 80);
    cameraDetector.updateSquare({ x: 500, y: -20, width: 0, height: 500 });

    expect(get(cameraDetector).square).toEqual({
      x: 99,
      y: 0,
      width: 1,
      height: 80
    });
  });

  it('trains the current Lab-backed color as the reference color', () => {
    const currentRgb = { r: 12, g: 34, b: 56 };
    cameraDetector.setCurrentRgb(currentRgb);

    expect(cameraDetector.trainFromCurrent()).toBe(true);
    expect(get(cameraDetector).referenceRgb).toEqual(currentRgb);
    expect(get(cameraDetector).referenceLab).toEqual(rgbToLab(currentRgb));
  });

  it('hydrates older RGB-only references into Lab references', () => {
    const referenceRgb = { r: 200, g: 80, b: 30 };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedDeviceId: '',
        square: { x: 20, y: 20, width: 50, height: 50 },
        sensitivity: 100,
        referenceRgb
      })
    );

    cameraDetector.hydrate();

    expect(get(cameraDetector).referenceRgb).toEqual(referenceRgb);
    expect(get(cameraDetector).referenceLab).toEqual(rgbToLab(referenceRgb));
  });

  it('does not train without a current RGB value', () => {
    expect(cameraDetector.trainFromCurrent()).toBe(false);
    expect(get(cameraDetector).referenceRgb).toBeNull();
    expect(get(cameraDetector).referenceLab).toBeNull();
  });
});
