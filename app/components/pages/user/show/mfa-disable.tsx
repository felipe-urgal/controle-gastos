'use client';

import { useState } from 'react';
import { FaKey } from 'react-icons/fa';

import { Button, Input } from '@/app/components/ui';
import { mfaService } from '@/app/services/mfa-service';

type FactorMode = 'totp' | 'recovery';

export default function MfaDisable({ onDisabled }: { onDisabled: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [factor, setFactor] = useState('');
  const [mode, setMode] = useState<FactorMode>('totp');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || !factor.trim()) {
      setError('Informe sua senha atual e o segundo fator.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await mfaService.disable({
        currentPassword: password,
        ...(mode === 'totp' ? { token: factor } : { recoveryCode: factor }),
      });
      setPassword('');
      setFactor('');
      setMode('totp');
      setOpen(false);
      onDisabled();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível desativar o 2FA.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-muted)]">O próximo login exigirá senha e segundo fator.</p>
        <Button type="button" variant="danger" onClick={() => setOpen(true)}>Desativar 2FA</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <p role="alert" className="text-sm text-[var(--expense)]">{error}</p>}
      <p className="text-sm text-[var(--text-muted)]">A desativação exige sua senha atual e TOTP ou um recovery code válido.</p>
      <Input type="password" label="Senha atual" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" icon={<FaKey />} disabled={busy} required />
      <Input type="text" label={mode === 'totp' ? 'Código do autenticador' : 'Código de recuperação'} value={factor} onChange={(event) => setFactor(event.target.value)} autoComplete="one-time-code" inputMode={mode === 'totp' ? 'numeric' : 'text'} disabled={busy} required />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="link" disabled={busy} onClick={() => { setMode((current) => current === 'totp' ? 'recovery' : 'totp'); setFactor(''); setError(''); }}>
          {mode === 'totp' ? 'Usar código de recuperação' : 'Usar autenticador'}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => { setOpen(false); setPassword(''); setFactor(''); setError(''); }}>Cancelar</Button>
          <Button type="submit" variant="danger" isLoading={busy} loadingText="Desativando...">Desativar 2FA</Button>
        </div>
      </div>
    </form>
  );
}
