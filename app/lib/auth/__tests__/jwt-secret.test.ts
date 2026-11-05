import { afterEach, describe, expect, it, vi } from 'vitest';

import { getJwtSecret } from '@/app/lib/auth/jwt-secret';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getJwtSecret', () => {
  it('devolve o segredo configurado', () => {
    vi.stubEnv('JWT_SECRET', 'segredo-de-teste');
    expect(getJwtSecret()).toBe('segredo-de-teste');
  });

  it('falha de forma explícita quando o segredo não está configurado', () => {
    vi.stubEnv('JWT_SECRET', '');
    expect(() => getJwtSecret()).toThrow('JWT_SECRET_NOT_CONFIGURED');
  });
});
