type ConditionAtom = {
  pointName: string;
  expected: boolean;
};

type Condition = ConditionAtom[][];

export type DetectionScriptRule = {
  lineNumber: number;
  triggerPointName: string;
  condition: Condition;
  trueFunctionName: string | null;
  falseFunctionName: string | null;
};

export type DetectionScriptParseResult = {
  rules: DetectionScriptRule[];
  errors: string[];
};

export type DetectionScriptEvaluationResult = {
  functionNames: string[];
  errors: string[];
};

export function parseDetectionScript(
  script: string,
  pointNames: string[],
  functionNames: string[]
): DetectionScriptParseResult {
  const availablePoints = new Set(pointNames);
  const availableFunctions = new Set(functionNames);
  const rules: DetectionScriptRule[] = [];
  const errors: string[] = [];

  script.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    const lineNumber = index + 1;

    if (!line) {
      return;
    }

    const match = line.match(
      /^ONACTION\s+([A-Za-z]\w*)\s*\|\s*(.+)\s*\?\s*FUNCTION\s+([A-Za-z]\w*|null)\s*:\s*FUNCTION\s+([A-Za-z]\w*|null)\s*$/i
    );

    if (!match) {
      errors.push(`Line ${lineNumber}: expected "ONACTION point | condition ? FUNCTION sound : FUNCTION null".`);
      return;
    }

    const [, triggerPointName, conditionSource, trueFunctionNameSource, falseFunctionNameSource] = match;
    const trueFunctionName = normalizeFunctionName(trueFunctionNameSource);
    const falseFunctionName = normalizeFunctionName(falseFunctionNameSource);

    if (!availablePoints.has(triggerPointName)) {
      errors.push(`Line ${lineNumber}: unknown trigger point "${triggerPointName}".`);
    }

    if (trueFunctionName && !availableFunctions.has(trueFunctionName)) {
      errors.push(`Line ${lineNumber}: unknown function "${trueFunctionName}".`);
    }

    if (falseFunctionName && !availableFunctions.has(falseFunctionName)) {
      errors.push(`Line ${lineNumber}: unknown function "${falseFunctionName}".`);
    }

    const parsedCondition = parseCondition(conditionSource, availablePoints, lineNumber);
    errors.push(...parsedCondition.errors);

    if (
      availablePoints.has(triggerPointName) &&
      parsedCondition.condition &&
      (!trueFunctionName || availableFunctions.has(trueFunctionName)) &&
      (!falseFunctionName || availableFunctions.has(falseFunctionName))
    ) {
      rules.push({
        lineNumber,
        triggerPointName,
        condition: parsedCondition.condition,
        trueFunctionName,
        falseFunctionName
      });
    }
  });

  return { rules, errors };
}

export function evaluateDetectionScript(
  script: string,
  pointStates: Record<string, boolean>,
  changedPointName: string,
  functionNames: string[]
): DetectionScriptEvaluationResult {
  const parsed = parseDetectionScript(script, Object.keys(pointStates), functionNames);
  const matchingFunctionNames = parsed.rules
    .filter((rule) => rule.triggerPointName === changedPointName)
    .map((rule) =>
      evaluateCondition(rule.condition, pointStates) ? rule.trueFunctionName : rule.falseFunctionName
    )
    .filter((functionName): functionName is string => functionName !== null);

  return {
    functionNames: matchingFunctionNames,
    errors: parsed.errors
  };
}

function parseCondition(
  source: string,
  availablePoints: Set<string>,
  lineNumber: number
): { condition: Condition | null; errors: string[] } {
  const condition = source.trim();
  const errors: string[] = [];

  if (!condition) {
    return { condition: null, errors: [`Line ${lineNumber}: condition is empty.`] };
  }

  if (/[()]/.test(condition)) {
    return {
      condition: null,
      errors: [`Line ${lineNumber}: parentheses are not supported in conditions yet.`]
    };
  }

  const orGroups = condition.split(/\s+OR\s+/i).map((group) => group.trim());
  const parsedGroups: Condition = [];

  for (const orGroup of orGroups) {
    if (!orGroup) {
      errors.push(`Line ${lineNumber}: OR must separate two conditions.`);
      continue;
    }

    const andAtoms = orGroup.split(/\s+AND\s+/i).map((atom) => atom.trim());
    const parsedAtoms: ConditionAtom[] = [];

    for (const atom of andAtoms) {
      const atomMatch = atom.match(/^([A-Za-z]\w*)\s+IS\s+(TRUE|FALSE)$/i);

      if (!atomMatch) {
        errors.push(`Line ${lineNumber}: invalid condition atom "${atom}".`);
        continue;
      }

      const [, pointName, expectedSource] = atomMatch;
      if (!availablePoints.has(pointName)) {
        errors.push(`Line ${lineNumber}: unknown condition point "${pointName}".`);
        continue;
      }

      parsedAtoms.push({
        pointName,
        expected: expectedSource.toUpperCase() === 'TRUE'
      });
    }

    if (parsedAtoms.length > 0) {
      parsedGroups.push(parsedAtoms);
    }
  }

  return {
    condition: errors.length === 0 && parsedGroups.length > 0 ? parsedGroups : null,
    errors
  };
}

function evaluateCondition(condition: Condition, pointStates: Record<string, boolean>): boolean {
  return condition.some((andGroup) =>
    andGroup.every((atom) => pointStates[atom.pointName] === atom.expected)
  );
}

function normalizeFunctionName(functionName: string): string | null {
  return functionName.toLowerCase() === 'null' ? null : functionName;
}
