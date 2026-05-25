import { describe, expect, it } from 'vitest';
import {
  LAB_LIGHTNESS_WEIGHT,
  MAX_LAB_DISTANCE,
  averageRgbFromImageData,
  clampSquare,
  isLabMatch,
  labDistance,
  rgbToLab,
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

  it('converts RGB samples to Lab colors', () => {
    expect(rgbToLab({ r: 255, g: 255, b: 255 })).toMatchObject({
      l: expect.closeTo(100, 3),
      a: expect.closeTo(0, 3),
      b: expect.closeTo(0, 3)
    });

    expect(rgbToLab({ r: 255, g: 0, b: 0 })).toMatchObject({
      l: expect.closeTo(53.241, 3),
      a: expect.closeTo(80.092, 3),
      b: expect.closeTo(67.203, 3)
    });
  });

  it('uses weighted Lab distance', () => {
    expect(
      labDistance(
        { l: 0, a: 0, b: 0 },
        { l: 20, a: 3, b: 4 }
      )
    ).toBe(Math.sqrt((20 * LAB_LIGHTNESS_WEIGHT) ** 2 + 3 ** 2 + 4 ** 2));
  });

  it('maps sensitivity from exact match to the theoretical maximum Lab distance', () => {
    expect(sensitivityToThreshold(1)).toBe(0);
    expect(sensitivityToThreshold(1000)).toBe(MAX_LAB_DISTANCE);
  });

  it('matches only exact colors at minimum sensitivity and every color at maximum sensitivity', () => {
    const black = rgbToLab({ r: 0, g: 0, b: 0 });
    const white = rgbToLab({ r: 255, g: 255, b: 255 });

    expect(isLabMatch(black, black, 1)).toBe(true);
    expect(isLabMatch(black, white, 1)).toBe(false);
    expect(isLabMatch(black, white, 1000)).toBe(true);
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
