## TEST

Commit reviewed: 5a9b3ec

Required changes:
- `front/src/lib/camera/detection.ts:29` sets `MAX_LAB_DISTANCE` with simultaneous `a*` and `b*` deltas of `255`, but the app's own `rgbToLab()` samples come from the sRGB camera range. With the current formula, the configured max is about `364.07`, while a sanity check over the RGB cube corners and a coarse RGB grid tops out around `254.19` for green vs. blue. Because `sensitivityToThreshold()` maps linearly from that larger value at `front/src/lib/camera/detection.ts:41`, sensitivity reaches the observed camera color range around `699`, making roughly the top third of the slider behave like "match everything." Recalibrate the max distance to the actual in-app Lab range for this conversion and `LAB_LIGHTNESS_WEIGHT`, or explicitly document/test the extra headroom if that saturation is intended. Add a regression that anchors opposite-hue behavior near the high end of the slider.

Verification:
- `npm run test --workspace front -- camera` passed: 5 files, 17 tests. Vitest printed the existing `--localstorage-file` warning.
- `npm run test` passed: backend 5 tests, frontend 22 tests. Vitest printed the existing `--localstorage-file` warning during frontend tests.
- `npm run build` passed.
- `npm run lint` passed.

TEST
