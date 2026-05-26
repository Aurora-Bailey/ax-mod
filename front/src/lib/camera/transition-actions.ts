import { evaluateDetectionScript } from './detection-script';

export type TransitionPoint = {
  name: string;
  isMatch: boolean;
  onActionFunctionId: string | null;
  offActionFunctionId: string | null;
};

export type TransitionActionState = {
  points: TransitionPoint[];
  functions: Array<{ name: string }>;
  script: string;
};

export type TransitionActionResult = {
  currentPointStates: Record<string, boolean>;
  functionNames: string[];
};

export function getTransitionFunctionNames(
  previousPointStates: Record<string, boolean> | null,
  state: TransitionActionState
): TransitionActionResult {
  const currentPointStates = Object.fromEntries(
    state.points.map((point) => [point.name, point.isMatch])
  );

  if (!previousPointStates) {
    return {
      currentPointStates,
      functionNames: []
    };
  }

  const functionNames: string[] = [];

  for (const point of state.points) {
    if (previousPointStates[point.name] === point.isMatch) {
      continue;
    }

    const directFunctionName = point.isMatch ? point.onActionFunctionId : point.offActionFunctionId;
    if (directFunctionName) {
      functionNames.push(directFunctionName);
    }

    functionNames.push(
      ...evaluateDetectionScript(
        state.script,
        currentPointStates,
        point.name,
        state.functions.map((item) => item.name)
      ).functionNames
    );
  }

  return {
    currentPointStates,
    functionNames
  };
}
