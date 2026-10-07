'use client';

import { useEffect, useState } from 'react';
import { FaKey } from 'react-icons/fa';

import { Button, Input } from '@/app/components/ui';
import { mfaService } from '@/app/services/mfa-service';

type FactorMode = 'totp' | 'recovery';

export default function MfaRecoveryCodes() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [factor, setFactor] = useState('');
  const [mode, setMode] = useState<FactorMode>('totp');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    void mfaService
      .getRecoveryCodeStatus()
      .then((result) => {
        if (active) setRemaining(result.remaining);
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Não foi possível carregar o estado dos códigos de recuperação.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setOpen(false);
    setPassword('');
    setFactor('');
    setMode('totp');
    setError('');
  };

  const regenerate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!password || !factor.trim()) {
      setError('Informe sua senha atual e o segundo fator.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const result = await mfaService.regenerateRecoveryCodes({
        currentPassword: password,
        ...(mode === 'totp'
          ? { token: factor.trim() }
          : { recoveryCode: factor.trim() }),
      });
      setRecoveryCodes(result.recoveryCodes);
      setRemaining(result.remaining);
      setPassword('');
      setFactor('');
      setMode('totp');
      setOpen(false);
      setNotice(
        'Novos códigos gerados. Os códigos anteriores não funcionam mais.',
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível regenerar os códigos de recuperação.',
      );
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setNotice('Códigos de recuperação copiados.');
    } catch {
      setError('Não foi possível copiar automaticamente.');
    }
  };

  const downloadCodes = () => {
    const blob = new Blob([recoveryCodes.join('\n')], {
      type: 'text/plain;charset=utf-8',
    });
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
        {notice && (
          <p role="status" className="mb-3 text-sm text-[var(--foreground)]">
            {notice}
          </p>
        )}
        <h3 className="font-semibold text-[var(--foreground)]">
          Novos códigos de recuperação
        </h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Eles são exibidos somente agora. Cada código funciona uma vez.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {recoveryCodes.map((item) => (
            <code
              key={item}
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold"
            >
              {item}
            </code>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void copyCodes()}>
            Copiar
          </Button>
          <Button type="button" variant="outline" onClick={downloadCodes}>
            Baixar .txt
          </Button>
          <Button
            type="button"
            onClick={() => {
              setRecoveryCodes([]);
              setNotice('');
            }}
          >
            Já guardei os novos códigos
          </Button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Códigos de recuperação
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {remaining === null
              ? 'Carregando quantidade restante…'
              : `${remaining} código(s) ainda disponível(is). Regenerar invalida todos os anteriores.`}
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm text-[var(--expense)]">
              {error}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(true);
            setError('');
          }}
        >
          Regenerar códigos
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={regenerate} className="space-y-4" noValidate>
      {error && (
        <p role="alert" className="text-sm text-[var(--expense)]">
          {error}
        </p>
      )}
      <p className="text-sm text-[var(--text-muted)]">
        Confirme sua senha e um segundo fator. Todos os códigos atuais serão
        invalidados.
      </p>
      <Input
        type="password"
        label="Senha atual para regenerar códigos"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        icon={<FaKey />}
        disabled={busy}
        required
      />
      <Input
        type="text"
        label={
          mode === 'totp'
            ? 'Código do autenticador para regenerar'
            : 'Código de recuperação para regenerar'
        }
        value={factor}
        onChange={(event) => setFactor(event.target.value)}
        autoComplete="one-time-code"
        inputMode={mode === 'totp' ? 'numeric' : 'text'}
        disabled={busy}
        required
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="link"
          disabled={busy}
          onClick={() => {
            setMode((current) => (current === 'totp' ? 'recovery' : 'totp'));
            setFactor('');
            setError('');
          }}
        >
          {mode === 'totp'
            ? 'Usar recovery code para regenerar'
            : 'Usar autenticador para regenerar'}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={resetForm}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={busy} loadingText="Regenerando...">
            Regenerar códigos
          </Button>
        </div>
      </div>
    </form>
  );
}
