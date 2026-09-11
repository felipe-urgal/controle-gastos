'use client';

import { useState } from 'react';
import { FaKey } from 'react-icons/fa';

import { Button, Input } from '@/app/components/ui';
import { mfaService } from '@/app/services/mfa-service';

export default function MfaEnrollment({ onActivated }: { onActivated: () => void }) {
  const [password, setPassword] = useState('');
  const [setup, setSetup] = useState<{ enrollmentToken: string; provisioningUri: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const begin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError('Informe sua senha atual.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await mfaService.startEnrollment(password);
      setSetup(result);
      setPassword('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível iniciar o 2FA.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!setup || !code.trim()) {
      setError('Informe o código atual do autenticador.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await mfaService.confirmEnrollment({ enrollmentToken: setup.enrollmentToken, token: code });
      setRecoveryCodes(result.recoveryCodes);
      setSetup(null);
      setCode('');
      setNotice('2FA ativado. Guarde os códigos de recuperação antes de continuar.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível confirmar o 2FA.');
    } finally {
      setBusy(false);
    }
  };

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setNotice('Códigos de recuperação copiados.');
    } catch {
      setError('Não foi possível copiar automaticamente.');
    }
  };

  const downloadRecoveryCodes = () => {
    const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'controle-gastos-recuperacao-2fa.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (recoveryCodes.length > 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--warning)]/45 bg-[var(--warning)]/10 p-4">
        {notice && <p role="status" className="mb-3 text-sm text-[var(--foreground)]">{notice}</p>}
        <h3 className="font-semibold text-[var(--foreground)]">Códigos de recuperação</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Eles são exibidos somente agora. Cada código funciona uma vez.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {recoveryCodes.map((item) => <code key={item} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold">{item}</code>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void copyRecoveryCodes()}>Copiar</Button>
          <Button type="button" variant="outline" onClick={downloadRecoveryCodes}>Baixar .txt</Button>
          <Button type="button" onClick={onActivated}>Já guardei</Button>
        </div>
      </div>
    );
  }

  if (setup) {
    return (
      <form onSubmit={confirm} className="space-y-4" noValidate>
        {error && <p role="alert" className="text-sm text-[var(--expense)]">{error}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="font-semibold text-[var(--foreground)]">Abrir no autenticador</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Em dispositivos compatíveis, abra o aplicativo pelo link de provisioning.</p>
            <Button as="a" href={setup.provisioningUri} variant="outline" className="mt-3">Abrir aplicativo</Button>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="font-semibold text-[var(--foreground)]">Chave manual</p>
            <code className="mt-2 block break-all text-sm font-semibold tracking-wide">{setup.secret}</code>
          </div>
        </div>
        <Input type="text" label="Código de 6 dígitos" value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" autoComplete="one-time-code" inputMode="numeric" disabled={busy} required />
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
      <p className="text-sm text-[var(--text-muted)]">Reconfirme sua senha. A proteção só será ativada depois do primeiro código válido.</p>
      <Input type="password" label="Senha atual" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" icon={<FaKey />} disabled={busy} required />
      <div className="flex justify-end"><Button type="submit" isLoading={busy} loadingText="Preparando...">Configurar 2FA</Button></div>
    </form>
  );
}
