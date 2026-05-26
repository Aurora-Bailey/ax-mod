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

  it('starts with point1 as a 50 by 50 square', () => {
    const point = get(cameraDetector).points[0];

    expect(point).toMatchObject({
      id: 'point1',
      name: 'point1',
      square: {
        width: 50,
        height: 50
      }
    });
  });

  it('starts with sound1 and a point1 activation script', () => {
    expect(get(cameraDetector).functions).toEqual([{ id: 'sound1', name: 'sound1', type: 'sound' }]);
    expect(get(cameraDetector).script).toBe(
      'ONACTION point1 | point1 IS TRUE ? FUNCTION sound1 : FUNCTION null'
    );
    expect(get(cameraDetector).scriptErrors).toEqual([]);
  });

  it('adds auto-named detection points', () => {
    cameraDetector.addPoint();
    cameraDetector.addPoint();

    expect(get(cameraDetector).points.map((point) => point.name)).toEqual([
      'point1',
      'point2',
      'point3'
    ]);
  });

  it('clamps point square updates to the active video size', () => {
    cameraDetector.setVideoSize(100, 80);
    cameraDetector.updatePointSquare('point1', { x: 500, y: -20, width: 0, height: 500 });

    expect(get(cameraDetector).points[0].square).toEqual({
      x: 99,
      y: 0,
      width: 1,
      height: 80
    });
  });

  it('trains the current Lab-backed color as the point reference color', () => {
    const currentRgb = { r: 12, g: 34, b: 56 };
    cameraDetector.setPointCurrentRgbs({ point1: currentRgb });

    expect(cameraDetector.trainPointFromCurrent('point1')).toBe(true);
    expect(get(cameraDetector).points[0].referenceRgb).toEqual(currentRgb);
    expect(get(cameraDetector).points[0].referenceLab).toEqual(rgbToLab(currentRgb));
  });

  it('hydrates older single-point RGB references into point1 Lab references', () => {
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

    expect(get(cameraDetector).points[0]).toMatchObject({
      id: 'point1',
      referenceRgb,
      referenceLab: rgbToLab(referenceRgb)
    });
  });

  it('adds auto-named sound functions', () => {
    cameraDetector.addFunction();
    cameraDetector.addFunction();

    expect(get(cameraDetector).functions).toEqual([
      { id: 'sound1', name: 'sound1', type: 'sound' },
      { id: 'sound2', name: 'sound2', type: 'sound' },
      { id: 'sound3', name: 'sound3', type: 'sound' }
    ]);
  });

  it('validates scripts against current points and functions', () => {
    cameraDetector.setScript('ONACTION point1 | point1 IS TRUE ? FUNCTION sound1 : FUNCTION null');

    expect(get(cameraDetector).scriptErrors).toEqual([]);

    cameraDetector.setScript('ONACTION point2 | point1 IS TRUE ? FUNCTION sound1 : FUNCTION null');

    expect(get(cameraDetector).scriptErrors).toEqual([
      'Line 1: unknown trigger point "point2".'
    ]);
  });

  it('hydrates empty function and script storage into the default script setup', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedDeviceId: '',
        points: [
          {
            id: 'point1',
            name: 'point1',
            enabled: true,
            square: { x: 20, y: 20, width: 50, height: 50 },
            sensitivity: 100,
            referenceRgb: null,
            referenceLab: null,
            onActionFunctionId: null,
            offActionFunctionId: null
          }
        ],
        functions: [],
        script: ''
      })
    );

    cameraDetector.hydrate();

    expect(get(cameraDetector).functions).toEqual([{ id: 'sound1', name: 'sound1', type: 'sound' }]);
    expect(get(cameraDetector).script).toBe(
      'ONACTION point1 | point1 IS TRUE ? FUNCTION sound1 : FUNCTION null'
    );
  });

  it('does not train without a current RGB value', () => {
    expect(cameraDetector.trainPointFromCurrent('point1')).toBe(false);
    expect(get(cameraDetector).points[0].referenceRgb).toBeNull();
    expect(get(cameraDetector).points[0].referenceLab).toBeNull();
  });
});
