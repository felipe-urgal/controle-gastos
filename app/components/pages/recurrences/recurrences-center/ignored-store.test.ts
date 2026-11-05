import { describe, expect, it } from 'vitest';

import {
  ignoredStorageKey,
  readIgnored,
  writeIgnored,
} from '@/app/components/pages/recurrences/recurrences-center/ignored-store';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('ignored-store', () => {
  it('grava e lê os ids por usuário', () => {
    const storage = memoryStorage();
    writeIgnored(storage, ignoredStorageKey('a'), new Set(['x', 'y']));
    expect([...readIgnored(storage, ignoredStorageKey('a'))].sort()).toEqual(['x', 'y']);
    expect(readIgnored(storage, ignoredStorageKey('b')).size).toBe(0);
  });

  it('ignora conteúdo inválido em vez de quebrar a tela', () => {
    const key = ignoredStorageKey('a');
    expect(readIgnored(memoryStorage({ [key]: '{nao-json' }), key).size).toBe(0);
    expect(readIgnored(memoryStorage({ [key]: '{"a":1}' }), key).size).toBe(0);
    expect([...readIgnored(memoryStorage({ [key]: '["ok",1,null]' }), key)]).toEqual(['ok']);
  });

  it('não propaga erro de armazenamento cheio ou bloqueado', () => {
    const broken = {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => writeIgnored(broken, 'k', new Set(['x']))).not.toThrow();
  });
});
