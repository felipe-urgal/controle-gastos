import { describe, expect, it } from 'vitest';

import { resolveCheckDatabaseUrl } from './check-database.mjs';

describe('resolveCheckDatabaseUrl', () => {
  it('aceita uma URL PostgreSQL explícita de check', () => {
    expect(
      resolveCheckDatabaseUrl({
        CHECK_DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/controle_gastos_test',
      }),
    ).toBe('postgresql://postgres:postgres@localhost:5432/controle_gastos_test');
  });

  it('recusa ausência da URL de check', () => {
    expect(() => resolveCheckDatabaseUrl({})).toThrow(/CHECK_DATABASE_URL/);
  });

  it('recusa protocolo que não seja PostgreSQL', () => {
    expect(() =>
      resolveCheckDatabaseUrl({
        CHECK_DATABASE_URL: 'https://example.com/controle_gastos_test',
      }),
    ).toThrow(/PostgreSQL/);
  });

  it('recusa URL sem database explícito', () => {
    expect(() =>
      resolveCheckDatabaseUrl({
        CHECK_DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/',
      }),
    ).toThrow(/database de teste/);
  });
});
