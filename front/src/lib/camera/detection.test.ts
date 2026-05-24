import { describe, expect, it } from 'vitest';
import {
  MAX_RGB_DISTANCE,
  averageRgbFromImageData,
  clampSquare,
  isRgbMatch,
  rgbDistance,
  sensitivityToThreshold
} from './detection';

describe('camera detection math', () => {
  it('averages RGB pixels inside the detection square', () => {
    const imageData = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        10, 20, 30, 255,
        30, 40, 50, 255
      ])
    };

    expect(averageRgbFromImageData(imageData, { x: 0, y: 0, width: 2, height: 1 })).toEqual({
      r: 20,
      g: 30,
      b: 40
    });
  });

  it('uses Euclidean RGB distance', () => {
    expect(rgbDistance({ r: 0, g: 0, b: 0 }, { r: 3, g: 4, b: 12 })).toBe(13);
  });

  it('maps sensitivity from exact match to the theoretical maximum distance', () => {
    expect(sensitivityToThreshold(1)).toBe(0);
    expect(sensitivityToThreshold(1000)).toBe(MAX_RGB_DISTANCE);
  });

  it('matches only exact colors at minimum sensitivity and every color at maximum sensitivity', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };

    expect(isRgbMatch(black, black, 1)).toBe(true);
    expect(isRgbMatch(black, white, 1)).toBe(false);
    expect(isRgbMatch(black, white, 1000)).toBe(true);
  });

  it('clamps square settings to the current video frame', () => {
    expect(clampSquare({ x: 200, y: -5, width: 0, height: 500 }, 100, 80)).toEqual({
      x: 99,
      y: 0,
      width: 1,
      height: 80
    });
  });
});
