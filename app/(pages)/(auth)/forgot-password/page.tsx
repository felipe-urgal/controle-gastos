'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheckCircle, FaClock, FaEnvelope, FaShieldAlt } from 'react-icons/fa';

import { useAuth } from '@/app/context';
import AuthShell from '@/app/components/layout/auth-shell';
import { Button, Input } from '@/app/components/ui';
import { getEmailError } from '@/app/lib/auth/credential-rules';
import { resolvePostLoginPath } from '@/app/lib/auth/protected-routes';

export default function ForgotPasswordPage() {
  const { forgotPassword, isAuthenticated } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ email: '' });
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '' });
  const [resendTimer, setResendTimer] = useState(0);
  const [retryTimer, setRetryTimer] = useState(0);

  useEffect(() => {
    if (isAuthenticated) router.replace(resolvePostLoginPath(window.location.search));
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (retryTimer <= 0) return;
    const timer = window.setTimeout(() => setRetryTimer((previous) => previous - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [retryTimer]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setTimeout(() => setResendTimer((previous) => previous - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendTimer]);

  if (isAuthenticated) return null;

  const validateForm = () => {
    const nextErrors = { email: getEmailError(form.email) ?? '' };

    setErrors(nextErrors);
    return !nextErrors.email;
  };

  const requestRecovery = async () => {
    const result = await forgotPassword(form.email);
    setMessage(result.message);
    setSuccess(result.success);
    if (result.success) setResendTimer(60);
    if (result.retryAfterSeconds) setRetryTimer(result.retryAfterSeconds);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    if (retryTimer > 0) return;

    setIsLoading(true);
    setMessage('');
    setSuccess(false);

    try {
      await requestRecovery();
    } catch {
      setSuccess(false);
      setMessage('Erro inesperado ao tentar recuperar senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    if (message) {
      setMessage('');
      setSuccess(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || retryTimer > 0 || isLoading) return;

    setIsLoading(true);
    setMessage('');

    try {
      await requestRecovery();
    } catch {
      setSuccess(false);
      setMessage('Erro ao reenviar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Recuperação"
      title={success ? 'Confira seu e-mail' : 'Recuperar senha'}
      description={success ? 'Se a solicitação foi aceita, use o link recebido para definir uma nova senha.' : 'Informe o e-mail da sua conta para solicitar um link de recuperação.'}
      backHref="/login"
      backLabel="Voltar ao login"
      footer={
        <>
          Não tem uma conta?{' '}
          <Link className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/signup">
            Criar conta
          </Link>
        </>
      }
    >
      {message && (
        <div
          role={success ? 'status' : 'alert'}
          aria-live="polite"
          className={`mb-5 rounded-[var(--radius-md)] border p-4 text-sm leading-relaxed ${
            success
              ? 'border-[var(--primary)]/40 bg-[var(--primary-subtle)] text-[var(--income)]'
              : 'border-[var(--danger)]/45 bg-[var(--danger-subtle)] text-[var(--expense)]'
          }`}
        >
          <div className="flex items-start gap-3">
            {success ? <FaCheckCircle className="mt-0.5 shrink-0" aria-hidden="true" /> : <FaShieldAlt className="mt-0.5 shrink-0" aria-hidden="true" />}
            <span>{message}</span>
          </div>
        </div>
      )}

      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            type="email"
            label="E-mail cadastrado"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="seu@email.com"
            disabled={isLoading}
            error={errors.email}
            icon={<FaEnvelope />}
            autoComplete="email"
            inputMode="email"
            enterKeyHint="send"
            autoCapitalize="none"
            spellCheck={false}
            required
          />

          <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-sm leading-relaxed text-[var(--text-muted)]">
            <FaShieldAlt className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
            <span>Por segurança, a resposta não confirma se um e-mail está cadastrado.</span>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={retryTimer > 0}
            isLoading={isLoading}
            loadingText="Enviando..."
          >
            Enviar link de recuperação
          </Button>

          {retryTimer > 0 && (
            <p className="text-center text-sm text-[var(--text-muted)]" aria-live="polite">
              Você poderá tentar novamente em {retryTimer >= 60 ? `${Math.ceil(retryTimer / 60)} min` : `${retryTimer} s`}.
            </p>
          )}
        </form>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="text-sm text-[var(--text-muted)]">Solicitação enviada para</p>
            <p className="mt-1 break-all text-base font-semibold text-[var(--foreground)]">{form.email}</p>
          </div>

          <div className="flex min-h-11 items-center justify-center gap-2 text-sm text-[var(--text-muted)]" aria-live="polite">
            <FaClock aria-hidden="true" />
            {resendTimer > 0 ? (
              <span>Reenviar em {resendTimer} segundos</span>
            ) : (
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={isLoading || retryTimer > 0}
                className="min-h-11 rounded-[var(--radius-md)] px-3 font-semibold text-[var(--primary)] hover:bg-[var(--surface-hover)] hover:text-[var(--primary-hover)] disabled:opacity-50"
              >
                {isLoading ? 'Enviando...' : 'Reenviar e-mail'}
              </button>
            )}
          </div>

          <Button as="a" href="/login" variant="outline" size="lg" fullWidth>
            Voltar ao login
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
