import { describe, expect, it } from 'vitest';

import { nearestIndex } from '@/app/components/charts/use-chart-scrub';

describe('nearestIndex', () => {
  const xs = [10, 20, 40, 100];

  it('escolhe o ponto mais próximo', () => {
    expect(nearestIndex(xs, 0)).toBe(0);
    expect(nearestIndex(xs, 31)).toBe(2);
    expect(nearestIndex(xs, 74)).toBe(3);
    expect(nearestIndex(xs, 500)).toBe(3);
  });

  it('desempata pelo primeiro ponto', () => {
    expect(nearestIndex(xs, 15)).toBe(0);
  });
});
