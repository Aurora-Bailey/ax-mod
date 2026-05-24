export type Rgb = {
  r: number;
  g: number;
  b: number;
};

export type DetectionSquare = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageDataLike = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export const MIN_SENSITIVITY = 1;
export const MAX_SENSITIVITY = 1000;
export const MAX_RGB_DISTANCE = Math.sqrt(3 * 255 ** 2);

export function clampSensitivity(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_SENSITIVITY;
  }

  return Math.min(MAX_SENSITIVITY, Math.max(MIN_SENSITIVITY, Math.round(value)));
}

export function sensitivityToThreshold(sensitivity: number): number {
  const clamped = clampSensitivity(sensitivity);
  return ((clamped - MIN_SENSITIVITY) / (MAX_SENSITIVITY - MIN_SENSITIVITY)) * MAX_RGB_DISTANCE;
}

export function rgbDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function isRgbMatch(current: Rgb | null, reference: Rgb | null, sensitivity: number): boolean {
  if (!current || !reference) {
    return false;
  }

  return rgbDistance(current, reference) <= sensitivityToThreshold(sensitivity);
}

export function clampSquare(square: DetectionSquare, frameWidth: number, frameHeight: number): DetectionSquare {
  const safeFrameWidth = Math.max(1, Math.round(frameWidth));
  const safeFrameHeight = Math.max(1, Math.round(frameHeight));
  const x = clampInteger(square.x, 0, safeFrameWidth - 1);
  const y = clampInteger(square.y, 0, safeFrameHeight - 1);
  const width = clampInteger(square.width, 1, safeFrameWidth - x);
  const height = clampInteger(square.height, 1, safeFrameHeight - y);

  return { x, y, width, height };
}

export function averageRgbFromImageData(
  imageData: ImageDataLike,
  square: DetectionSquare
): Rgb | null {
  const region = clampSquare(square, imageData.width, imageData.height);
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      r += imageData.data[offset] ?? 0;
      g += imageData.data[offset + 1] ?? 0;
      b += imageData.data[offset + 2] ?? 0;
      count += 1;
    }
  }

  if (count === 0) {
    return null;
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  };
}

export function formatRgb(rgb: Rgb | null): string {
  if (!rgb) {
    return 'Not trained';
  }

  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}
