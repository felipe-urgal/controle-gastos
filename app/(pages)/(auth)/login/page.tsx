'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaShieldAlt,
  FaSignInAlt,
} from 'react-icons/fa';

import { useAuth } from '@/app/context';
import AuthShell from '@/app/components/layout/auth-shell';
import { Button, Input } from '@/app/components/ui';
import { getEmailError } from '@/app/lib/auth/credential-rules';
import { resolvePostLoginPath } from '@/app/lib/auth/protected-routes';
import { ApiClientError } from '@/app/services/api-client';
import { authService } from '@/app/services/auth-service';

type MfaMode = 'totp' | 'recovery';

type MfaStep = {
  challenge: string;
  expiresAt: number;
};

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function LoginPage() {
  const { login, verifyMfa, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mfaStep, setMfaStep] = useState<MfaStep | null>(null);
  const [mfaMode, setMfaMode] = useState<MfaMode>('totp');
  const [mfaValue, setMfaValue] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [verificationInvalid, setVerificationInvalid] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(resolvePostLoginPath(window.location.search));
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const storedNotice = window.sessionStorage.getItem('auth-notice');
    const reason = params.get('reason') ?? storedNotice;
    const verification = params.get('verification');
    if (verification === 'invalid') {
      const invalidTimer = window.setTimeout(() => setVerificationInvalid(true), 0);
      params.delete('verification');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
      return () => window.clearTimeout(invalidTimer);
    }

    const nextNotice =
      reason === 'password-changed'
        ? 'Senha alterada com sucesso. Entre novamente.'
        : verification === 'email-changed'
          ? 'E-mail alterado com sucesso. Entre novamente com o novo endereço.'
          : verification === 'success'
            ? 'E-mail confirmado com sucesso. Entre na sua conta.'
            : '';

    if (!nextNotice) return;

    window.sessionStorage.removeItem('auth-notice');
    params.delete('verification');
    params.delete('reason');
    const remaining = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${remaining ? `?${remaining}` : ''}`);

    const noticeTimer = window.setTimeout(() => {
      setNotice(nextNotice);
    }, 0);

    return () => window.clearTimeout(noticeTimer);
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!mfaStep) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [mfaStep]);

  if (isLoading || isAuthenticated) return null;

  const mfaSecondsLeft = mfaStep
    ? Math.max(0, Math.ceil((mfaStep.expiresAt - now) / 1000))
    : null;
  const mfaExpired = mfaSecondsLeft === 0;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));

    if (errors[name as keyof typeof errors]) {
      setErrors((previous) => ({ ...previous, [name]: '' }));
    }
    if (error) setError('');
  };

  const handleCredentialsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await login({ email: form.email, password: form.password });
      if (result.mfaRequired) {
        setNow(Date.now());
        setMfaStep({
          challenge: result.challenge,
          expiresAt: Date.now() + result.expiresInSeconds * 1000,
        });
        setForm((previous) => ({ ...previous, password: '' }));
        setMfaMode('totp');
        setMfaValue('');
      }
    } catch (caught: unknown) {
      if (caught instanceof ApiClientError && caught.fieldErrors) {
        setErrors({
          email: caught.fieldErrors.email ?? '',
          password: caught.fieldErrors.password ?? '',
        });
      } else if (caught instanceof ApiClientError && caught.status === 429) {
        const wait = caught.retryAfterSeconds
          ? ` Tente novamente em cerca de ${Math.max(1, Math.ceil(caught.retryAfterSeconds / 60))} min.`
          : '';
        setError(`Muitas tentativas.${wait}`);
      } else {
        setError(caught instanceof Error ? caught.message : 'Erro ao fazer login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mfaStep) return;

    if (mfaExpired) {
      setError('O tempo para confirmar expirou. Volte e entre novamente.');
      return;
    }

    if (!mfaValue.trim()) {
      setError(
        mfaMode === 'totp'
          ? 'Informe o código de 6 dígitos do autenticador.'
          : 'Informe um código de recuperação.'
      );
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await verifyMfa({
        challenge: mfaStep.challenge,
        ...(mfaMode === 'totp'
          ? { token: mfaValue }
          : { recoveryCode: mfaValue }),
      });
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível validar o segundo fator.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetMfaStep = () => {
    setMfaStep(null);
    setMfaMode('totp');
    setMfaValue('');
    setError('');
  };

  const handleResendVerification = async () => {
    const emailError = getEmailError(form.email);
    if (emailError) {
      setErrors((previous) => ({ ...previous, email: emailError }));
      return;
    }

    setResendState('sending');
    try {
      await authService.resendVerification(form.email);
      setResendState('sent');
    } catch (caught) {
      setResendState('idle');
      setError(
        caught instanceof ApiClientError && caught.status === 429
          ? 'Muitas solicitações de reenvio. Tente novamente mais tarde.'
          : 'Não foi possível solicitar o reenvio. Tente novamente.',
      );
    }
  };

  const useRecoveryMode = mfaMode === 'recovery';

  return (
    <AuthShell
      eyebrow={mfaStep ? 'Verificação em duas etapas' : 'Acesso'}
      title={mfaStep ? 'Confirme que é você' : 'Entrar na sua conta'}
      description={
        mfaStep
          ? `Use seu aplicativo autenticador ou um código de recuperação. Você tem ${formatCountdown(mfaSecondsLeft ?? 0)} para confirmar.`
          : 'Continue de onde parou e acesse seu dashboard, contas, transações e calendário financeiro.'
      }
      footer={
        mfaStep ? undefined : (
          <>
            Ainda não tem conta?{' '}
            <Link className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/signup">
              Criar conta
            </Link>
          </>
        )
      }
    >
      {notice && !mfaStep && (
        <div role="status" className="mb-5 rounded-[var(--radius-md)] border border-[var(--primary)]/35 bg-[var(--primary-subtle)] p-4 text-sm leading-relaxed text-[var(--foreground)]">
          {notice}
        </div>
      )}

      {error && (
        <div role="alert" className="mb-5 rounded-[var(--radius-md)] border border-[var(--danger)]/45 bg-[var(--danger-subtle)] p-4 text-sm leading-relaxed text-[var(--expense)]">
          {error}
        </div>
      )}

      {verificationInvalid && !mfaStep && (
        <div role="alert" className="mb-5 rounded-[var(--radius-md)] border border-[var(--danger)]/45 bg-[var(--danger-subtle)] p-4 text-sm leading-relaxed text-[var(--expense)]">
          <p>Link inválido ou expirado.</p>
          {resendState === 'sent' ? (
            <p className="mt-2 text-[var(--foreground)]">
              Se houver um cadastro pendente para este e-mail, enviaremos um novo link.
            </p>
          ) : (
            <p className="mt-2">
              Informe seu e-mail abaixo e{' '}
              <button
                type="button"
                onClick={() => void handleResendVerification()}
                disabled={resendState === 'sending'}
                className="font-semibold underline underline-offset-2 disabled:opacity-60"
              >
                {resendState === 'sending' ? 'Enviando...' : 'reenvie a verificação'}
              </button>
              .
            </p>
          )}
        </div>
      )}

      {mfaStep ? (
        <form onSubmit={handleMfaSubmit} className="space-y-5" noValidate>
          {mfaExpired && (
            <div role="alert" className="rounded-[var(--radius-md)] border border-[var(--danger)]/45 bg-[var(--danger-subtle)] p-4 text-sm leading-relaxed text-[var(--expense)]">
              O tempo para confirmar expirou. Volte e entre novamente com sua senha.
            </div>
          )}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[var(--primary)]" aria-hidden="true">
                <FaShieldAlt />
              </span>
              <div>
                <p className="font-semibold text-[var(--foreground)]">
                  {useRecoveryMode ? 'Código de recuperação' : 'Código do autenticador'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                  {useRecoveryMode
                    ? 'Cada código de recuperação funciona somente uma vez.'
                    : 'Digite o código atual de 6 dígitos exibido no seu aplicativo autenticador.'}
                </p>
              </div>
            </div>
          </div>

          <Input
            autoFocus
            type="text"
            label={useRecoveryMode ? 'Código de recuperação' : 'Código de 6 dígitos'}
            name="mfa-code"
            value={mfaValue}
            onChange={(event) => {
              setMfaValue(event.target.value);
              if (error) setError('');
            }}
            placeholder={useRecoveryMode ? 'XXXX-XXXX-XXXX-XXXX-XXXX' : '123456'}
            icon={useRecoveryMode ? <FaKey /> : <FaShieldAlt />}
            disabled={isSubmitting}
            autoComplete="one-time-code"
            inputMode={useRecoveryMode ? 'text' : 'numeric'}
            autoCapitalize="characters"
            spellCheck={false}
            required
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            icon={<FaSignInAlt />}
            iconPosition="right"
            isLoading={isSubmitting}
            disabled={mfaExpired}
            loadingText="Validando..."
          >
            Confirmar e entrar
          </Button>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<FaArrowLeft />}
              onClick={resetMfaStep}
              disabled={isSubmitting}
            >
              Voltar ao login
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setMfaMode((previous) => (previous === 'totp' ? 'recovery' : 'totp'));
                setMfaValue('');
                setError('');
              }}
              disabled={isSubmitting}
            >
              {useRecoveryMode ? 'Usar autenticador' : 'Usar código de recuperação'}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleCredentialsSubmit} className="space-y-5" noValidate>
          <Input
            type="email"
            label="E-mail"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="seu@email.com"
            icon={<FaEnvelope />}
            disabled={isSubmitting}
            error={errors.email}
            autoComplete="email"
            inputMode="email"
            enterKeyHint="next"
            autoCapitalize="none"
            spellCheck={false}
            required
          />

          <Input
            type={showPassword ? 'text' : 'password'}
            label="Senha"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Digite sua senha"
            icon={<FaLock />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                title={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
              </button>
            }
            disabled={isSubmitting}
            error={errors.password}
            autoComplete="current-password"
            enterKeyHint="go"
            autoCapitalize="none"
            spellCheck={false}
            required
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="rounded text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            icon={<FaSignInAlt />}
            iconPosition="right"
            isLoading={isSubmitting}
            loadingText="Entrando..."
          >
            Entrar
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
