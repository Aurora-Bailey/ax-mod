import { describe, expect, it } from 'vitest';
import { evaluateDetectionScript, parseDetectionScript } from './detection-script';

const pointNames = ['point1', 'point2'];
const functionNames = ['sound1', 'sound2'];

describe('detection script', () => {
  it('parses valid transition rules', () => {
    expect(
      parseDetectionScript(
        'ONACTION point1 | point1 IS TRUE ? FUNCTION sound1 : FUNCTION sound2',
        pointNames,
        functionNames
      )
    ).toMatchObject({
      errors: [],
      rules: [
        {
          triggerPointName: 'point1',
          trueFunctionName: 'sound1',
          falseFunctionName: 'sound2'
        }
      ]
    });
  });

  it('evaluates AND and OR conditions for the changed point', () => {
    const script =
      'ONACTION point2 | point1 IS FALSE AND point2 IS TRUE ? FUNCTION sound2 : FUNCTION null\n' +
      'ONACTION point1 | point1 IS TRUE OR point2 IS TRUE ? FUNCTION sound1 : FUNCTION sound2';

    expect(
      evaluateDetectionScript(
        script,
        { point1: false, point2: true },
        'point2',
        functionNames
      )
    ).toEqual({
      functionNames: ['sound2'],
      errors: []
    });
  });

  it('returns the false function when the condition fails', () => {
    expect(
      evaluateDetectionScript(
        'ONACTION point1 | point2 IS TRUE ? FUNCTION sound1 : FUNCTION sound2',
        { point1: true, point2: false },
        'point1',
        functionNames
      ).functionNames
    ).toEqual(['sound2']);
  });

  it('supports FUNCTION null as a no-op branch', () => {
    expect(
      evaluateDetectionScript(
        'ONACTION point1 | point1 IS FALSE ? FUNCTION sound1 : FUNCTION null',
        { point1: true, point2: false },
        'point1',
        functionNames
      ).functionNames
    ).toEqual([]);
  });

  it('reports invalid lines without producing executable rules', () => {
    expect(
      parseDetectionScript(
        'ONACTION point3 | point1 IS TRUE ? FUNCTION bad : FUNCTION null',
        pointNames,
        functionNames
      )
    ).toEqual({
      rules: [],
      errors: ['Line 1: unknown trigger point "point3".', 'Line 1: unknown function "bad".']
    });
  });

  it('rejects unsupported parentheses', () => {
    expect(
      parseDetectionScript(
        'ONACTION point1 | (point1 IS TRUE) ? FUNCTION sound1 : FUNCTION null',
        pointNames,
        functionNames
      ).errors
    ).toEqual(['Line 1: parentheses are not supported in conditions yet.']);
  });
});
