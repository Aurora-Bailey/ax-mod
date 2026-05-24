import { describe, expect, it, vi } from 'vitest';
import { createMatchTransitionNotifier } from './match-transition';

describe('match transition notifier', () => {
  it('calls the injected sound function only on red-to-green transitions', () => {
    const playSound = vi.fn();
    const notifier = createMatchTransitionNotifier(playSound);

    notifier.update(false);
    notifier.update(false);
    notifier.update(true);
    notifier.update(true);
    notifier.update(false);
    notifier.update(true);

    expect(playSound).toHaveBeenCalledTimes(2);
  });
});
