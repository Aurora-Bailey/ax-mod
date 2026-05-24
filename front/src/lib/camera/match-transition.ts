export type MatchTransitionNotifier = {
  update(nextMatch: boolean): void;
};

export function createMatchTransitionNotifier(onMatch: () => void): MatchTransitionNotifier {
  let previousMatch = false;

  return {
    update(nextMatch: boolean): void {
      if (!previousMatch && nextMatch) {
        onMatch();
      }

      previousMatch = nextMatch;
    }
  };
}
