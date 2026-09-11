'use client';

import { useState } from 'react';
import { FaKey } from 'react-icons/fa';

import { Button, Input } from '@/app/components/ui';
import { mfaService } from '@/app/services/mfa-service';

export default function MfaEnrollment({ onActivated }: { onActivated: () => void }) {
  const [password, setPassword] = useState('');
  const [setup, setSetup] = useState<{ enrollmentToken: string; provisioningUri: string; manualKey: string } | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const begin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await mfaService.startEnrollment(password);
      setSetup({
        enrollmentToken: result.enrollmentToken,
        provisioningUri: result.provisioningUri,
        manualKey: result.secret,
      });
      setPassword('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível iniciar o 2FA.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!setup) return;
    setBusy(true);
    setError('');
    try {
      const result = await mfaService.confirmEnrollment({ enrollmentToken: setup.enrollmentToken, token: code });
      setRecoveryCodes(result.recoveryCodes);
      setSetup(null);
      setCode('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível confirmar o 2FA.');
    } finally {
      setBusy(false);
    }
  };

  if (recoveryCodes.length > 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--warning)]/45 bg-[var(--warning)]/10 p-4">
        <h3 className="font-semibold text-[var(--foreground)]">Guarde seus códigos de recuperação</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Cada código funciona somente uma vez.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {recoveryCodes.map((item) => <code key={item} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold">{item}</code>)}
        </div>
        <Button type="button" className="mt-4" onClick={onActivated}>Já guardei os códigos</Button>
      </div>
    );
  }

  if (setup) {
    return (
      <form onSubmit={confirm} className="space-y-4" noValidate>
        {error && <p role="alert" className="text-sm text-[var(--expense)]">{error}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="font-semibold">Abrir no autenticador</p>
            <Button as="a" href={setup.provisioningUri} variant="outline" className="mt-3">Abrir aplicativo</Button>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="font-semibold">Chave manual</p>
            <code className="mt-2 block break-all text-sm font-semibold tracking-wide">{setup.manualKey}</code>
          </div>
        </div>
        <Input type="text" label="Código de 6 dígitos" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" inputMode="numeric" disabled={busy} required />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setSetup(null)} disabled={busy}>Cancelar</Button>
          <Button type="submit" isLoading={busy} loadingText="Ativando...">Confirmar e ativar</Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={begin} className="space-y-4" noValidate>
      {error && <p role="alert" className="text-sm text-[var(--expense)]">{error}</p>}
      <p className="text-sm text-[var(--text-muted)]">Reconfirme sua senha. O 2FA só será ativado depois de um código válido.</p>
      <Input type="password" label="Senha atual" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" icon={<FaKey />} disabled={busy} required />
      <div className="flex justify-end"><Button type="submit" isLoading={busy} loadingText="Preparando...">Configurar 2FA</Button></div>
    </form>
  );
}
