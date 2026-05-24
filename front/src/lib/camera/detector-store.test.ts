import { get } from 'svelte/store';
import { afterEach, describe, expect, it } from 'vitest';
import { cameraDetector } from './detector-store';

describe('camera detector store', () => {
  afterEach(() => {
    cameraDetector.resetForTests();
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

  it('trains the current RGB value as the reference color', () => {
    cameraDetector.setCurrentRgb({ r: 12, g: 34, b: 56 });

    expect(cameraDetector.trainFromCurrent()).toBe(true);
    expect(get(cameraDetector).referenceRgb).toEqual({ r: 12, g: 34, b: 56 });
  });

  it('does not train without a current RGB value', () => {
    expect(cameraDetector.trainFromCurrent()).toBe(false);
    expect(get(cameraDetector).referenceRgb).toBeNull();
  });
});
