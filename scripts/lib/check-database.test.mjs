import { describe, expect, it, vi } from 'vitest';

import {
  resolveCheckDatabaseUrl,
  waitForCheckDatabase,
} from './check-database.mjs';

describe('resolveCheckDatabaseUrl', () => {
  it('aceita uma URL PostgreSQL explícita de check', () => {
    expect(
      resolveCheckDatabaseUrl({
        CHECK_DATABASE_URL:
          'postgresql://postgres:postgres@localhost:5432/controle_gastos_test',
      }),
    ).toBe(
      'postgresql://postgres:postgres@localhost:5432/controle_gastos_test',
    );
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

describe('waitForCheckDatabase', () => {
  const databaseUrl =
    'postgresql://check-user:super-secret@127.0.0.1:55432/controle_gastos_check';

  it('segue imediatamente quando o banco já está disponível', async () => {
    const probe = vi.fn().mockResolvedValue(true);
    const sleep = vi.fn();

    await expect(
      waitForCheckDatabase(databaseUrl, { probe, sleep }),
    ).resolves.toBeUndefined();

    expect(probe).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('repete a sondagem enquanto o banco está iniciando', async () => {
    const probe = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      waitForCheckDatabase(databaseUrl, {
        timeoutMs: 1_000,
        retryIntervalMs: 10,
        probe,
        sleep,
      }),
    ).resolves.toBeUndefined();

    expect(probe).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('falha com endpoint sanitizado quando o timeout expira', async () => {
    const probe = vi.fn().mockResolvedValue(false);

    await expect(
      waitForCheckDatabase(databaseUrl, { timeoutMs: 0, probe }),
    ).rejects.toThrow(
      'Banco isolado de check indisponível em 127.0.0.1:55432 após 0s.',
    );

    await waitForCheckDatabase(databaseUrl, { timeoutMs: 0, probe }).catch(
      (error) => {
        expect(error.message).not.toContain('super-secret');
        expect(error.message).not.toContain('check-user');
        expect(error.message).not.toContain('controle_gastos_check');
      },
    );
  });
});
