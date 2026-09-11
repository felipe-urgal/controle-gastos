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

type MfaMode = 'totp' | 'recovery';

type MfaStep = {
  challenge: string;
  expiresInSeconds: number;
};

export default function LoginPage() {
  const { login, verifyMfa, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mfaStep, setMfaStep] = useState<MfaStep | null>(null);
  const [mfaMode, setMfaMode] = useState<MfaMode>('totp');
  const [mfaValue, setMfaValue] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isLoading || isAuthenticated) return null;

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
        setMfaStep({
          challenge: result.challenge,
          expiresInSeconds: result.expiresInSeconds,
        });
        setForm((previous) => ({ ...previous, password: '' }));
        setMfaMode('totp');
        setMfaValue('');
      }
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : 'Erro ao fazer login';

      if (message.includes(',')) {
        const fieldErrors = { email: '', password: '' };

        message
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => {
            if (item.toLowerCase().includes('e-mail')) fieldErrors.email = item;
            if (item.toLowerCase().includes('senha')) fieldErrors.password = item;
          });

        setErrors(fieldErrors);
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mfaStep) return;

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

  const useRecoveryMode = mfaMode === 'recovery';
  const expiryMinutes = Math.max(1, Math.ceil((mfaStep?.expiresInSeconds ?? 300) / 60));

  return (
    <AuthShell
      eyebrow={mfaStep ? 'Verificação em duas etapas' : 'Acesso'}
      title={mfaStep ? 'Confirme que é você' : 'Entrar na sua conta'}
      description={
        mfaStep
          ? `Use seu aplicativo autenticador ou um código de recuperação. O challenge expira em até ${expiryMinutes} min.`
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
      {error && (
        <div role="alert" className="mb-5 rounded-[var(--radius-md)] border border-[var(--danger)]/45 bg-[var(--danger-subtle)] p-4 text-sm leading-relaxed text-[var(--expense)]">
          {error}
        </div>
      )}

      {mfaStep ? (
        <form onSubmit={handleMfaSubmit} className="space-y-5" noValidate>
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
