import { describe, expect, it } from 'vitest';

import { formatAttachmentSize, scaledSize } from '@/app/lib/transactions/attachment-client';

describe('scaledSize', () => {
  it('reduz pelo lado maior mantendo a proporção e nunca amplia', () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(scaledSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(scaledSize(1600, 1600)).toEqual({ width: 1600, height: 1600 });
    expect(scaledSize(10_000, 1)).toEqual({ width: 1600, height: 1 });
  });
});

describe('formatAttachmentSize', () => {
  it('mostra KB abaixo de 1 MB e MB com vírgula acima', () => {
    expect(formatAttachmentSize(500)).toBe('1 KB');
    expect(formatAttachmentSize(204_800)).toBe('200 KB');
    expect(formatAttachmentSize(1_572_864)).toBe('1,5 MB');
  });
});
