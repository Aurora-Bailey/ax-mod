import { describe, expect, it } from 'vitest';
import { getTransitionFunctionNames } from './transition-actions';

describe('transition actions', () => {
  it('does not run actions on the initial state snapshot', () => {
    expect(
      getTransitionFunctionNames(null, {
        points: [
          {
            name: 'point1',
            isMatch: true,
            onActionFunctionId: 'sound1',
            offActionFunctionId: null
          }
        ],
        functions: [{ name: 'sound1' }],
        script: ''
      }).functionNames
    ).toEqual([]);
  });

  it('runs direct point actions before matching script actions on transitions', () => {
    expect(
      getTransitionFunctionNames(
        { point1: false, point2: true },
        {
          points: [
            {
              name: 'point1',
              isMatch: true,
              onActionFunctionId: 'sound1',
              offActionFunctionId: null
            },
            {
              name: 'point2',
              isMatch: true,
              onActionFunctionId: null,
              offActionFunctionId: null
            }
          ],
          functions: [{ name: 'sound1' }, { name: 'sound2' }],
          script: 'ONACTION point1 | point1 IS TRUE AND point2 IS TRUE ? FUNCTION sound2 : FUNCTION null'
        }
      ).functionNames
    ).toEqual(['sound1', 'sound2']);
  });

  it('runs off actions when a point turns false', () => {
    expect(
      getTransitionFunctionNames(
        { point1: true },
        {
          points: [
            {
              name: 'point1',
              isMatch: false,
              onActionFunctionId: 'sound1',
              offActionFunctionId: 'sound2'
            }
          ],
          functions: [{ name: 'sound1' }, { name: 'sound2' }],
          script: ''
        }
      ).functionNames
    ).toEqual(['sound2']);
  });
});
