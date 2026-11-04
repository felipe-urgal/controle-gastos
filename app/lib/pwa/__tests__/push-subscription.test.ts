import { describe, expect, it } from 'vitest';

import { derivePushStatus, urlBase64ToUint8Array } from '@/app/lib/pwa/push-subscription';

describe('urlBase64ToUint8Array', () => {
  it('decodifica base64url (com - e _) e completa o padding', () => {
    // "SGVsbG8_" em base64url é "Hello?" (o "_" vira "/" no base64 comum).
    expect([...urlBase64ToUint8Array('SGVsbG8_')]).toEqual([...new TextEncoder().encode('Hello?')]);
    expect([...urlBase64ToUint8Array('YQ')]).toEqual([97]);
    expect([...urlBase64ToUint8Array('-_8')]).toEqual([251, 255]);
  });

  it('chave VAPID típica (65 bytes) mantém o tamanho', () => {
    const key = Buffer.from(Uint8Array.from({ length: 65 }, (_, index) => index + 1))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(urlBase64ToUint8Array(key)).toHaveLength(65);
  });
});

describe('derivePushStatus', () => {
  const base = { supported: true, configured: true, permission: 'default' as const, subscribed: false };

  it('servidor sem VAPID: indisponível, mesmo que o navegador suporte', () => {
    expect(derivePushStatus({ ...base, configured: false })).toBe('unconfigured');
  });

  it('navegador sem suporte (ou sem service worker)', () => {
    expect(derivePushStatus({ ...base, supported: false })).toBe('unsupported');
  });

  it('permissão negada vence tudo que vem depois', () => {
    expect(derivePushStatus({ ...base, permission: 'denied', subscribed: true })).toBe('denied');
  });

  it('só está ligado com permissão concedida e inscrição ativa', () => {
    expect(derivePushStatus({ ...base, permission: 'granted', subscribed: true })).toBe('on');
    expect(derivePushStatus({ ...base, permission: 'granted', subscribed: false })).toBe('off');
    expect(derivePushStatus({ ...base, permission: 'default', subscribed: true })).toBe('off');
  });
});
