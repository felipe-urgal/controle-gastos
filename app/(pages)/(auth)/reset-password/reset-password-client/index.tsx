'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaCheck,
  FaCheckCircle,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
} from 'react-icons/fa';

import AuthShell from '@/app/components/layout/auth-shell';
import { Button, Input } from '@/app/components/ui';

export default function ResetPasswordClient({ token }: { token?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ novaSenha: '', confirmarSenha: '' });
  const [errors, setErrors] = useState({ novaSenha: '', confirmarSenha: '' });
  const [showPassword, setShowPassword] = useState({ novaSenha: false, confirmarSenha: false });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [redirectTimer, setRedirectTimer] = useState(5);

  useEffect(() => {
    if (status !== 'success') return;

    if (redirectTimer <= 0) {
      router.push('/login');
      return;
    }

    const timer = window.setTimeout(() => setRedirectTimer((previous) => previous - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [status, redirectTimer, router]);

  const requirements = {
    length: form.novaSenha.length >= 6,
    uppercase: /[A-Z]/.test(form.novaSenha),
    number: /[0-9]/.test(form.novaSenha),
  };

  const validateForm = () => {
    const nextErrors = { novaSenha: '', confirmarSenha: '' };
    let valid = true;

    if (!form.novaSenha) {
      nextErrors.novaSenha = 'Nova senha é obrigatória';
      valid = false;
    } else if (!requirements.length) {
      nextErrors.novaSenha = 'Mínimo 6 caracteres';
      valid = false;
    } else if (!requirements.uppercase) {
      nextErrors.novaSenha = 'Deve conter uma letra maiúscula';
      valid = false;
    } else if (!requirements.number) {
      nextErrors.novaSenha = 'Deve conter um número';
      valid = false;
    }

    if (!form.confirmarSenha) {
      nextErrors.confirmarSenha = 'Confirme sua senha';
      valid = false;
    } else if (form.novaSenha !== form.confirmarSenha) {
      nextErrors.confirmarSenha = 'As senhas não coincidem';
      valid = false;
    }

    setErrors(nextErrors);
    return valid;
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    if (status === 'error') {
      setStatus('idle');
      setMessage('');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      setStatus('error');
      setMessage('Token inválido ou expirado. Solicite um novo link de recuperação.');
      return;
    }

    if (!validateForm()) return;

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha: form.novaSenha }),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Senha redefinida com sucesso!');
        setForm({ novaSenha: '', confirmarSenha: '' });
      } else {
        setStatus('error');
        setMessage(data.message || 'Erro ao redefinir senha.');
      }
    } catch {
      setStatus('error');
      setMessage('Erro inesperado. Tente novamente.');
    }
  };

  if (!token) {
    return (
      <AuthShell
        eyebrow="Recuperação"
        title="Link inválido ou expirado"
        description="Este link não pode mais ser usado. Solicite uma nova recuperação para continuar com segurança."
        backHref="/login"
        backLabel="Voltar ao login"
      >
        <div role="alert" className="rounded-[var(--radius-md)] border border-[var(--danger)]/45 bg-[var(--danger-subtle)] p-4 text-sm leading-relaxed text-[var(--expense)]">
          O token de recuperação está ausente ou não é válido para esta página.
        </div>
        <div className="mt-5 grid gap-3">
          <Button as="a" href="/forgot-password" fullWidth size="lg" icon={<FaEnvelope />}>
            Solicitar novo link
          </Button>
          <Button as="a" href="/login" fullWidth size="lg" variant="outline">
            Voltar ao login
          </Button>
        </div>
      </AuthShell>
    );
  }

  const isSuccess = status === 'success';
  const isLoading = status === 'loading';

  return (
    <AuthShell
      eyebrow="Nova senha"
      title={isSuccess ? 'Senha redefinida' : 'Definir nova senha'}
      description={isSuccess ? 'Sua senha foi atualizada. Você poderá entrar novamente em instantes.' : 'Escolha uma senha nova que atenda aos requisitos abaixo.'}
      backHref="/login"
      backLabel="Voltar ao login"
    >
      {message && (
        <div
          role={isSuccess ? 'status' : 'alert'}
          aria-live="polite"
          className={`mb-5 rounded-[var(--radius-md)] border p-4 text-sm leading-relaxed ${
            isSuccess
              ? 'border-[var(--primary)]/40 bg-[var(--primary-subtle)] text-[var(--income)]'
              : 'border-[var(--danger)]/45 bg-[var(--danger-subtle)] text-[var(--expense)]'
          }`}
        >
          <div className="flex items-start gap-3">
            {isSuccess ? <FaCheckCircle className="mt-0.5 shrink-0" aria-hidden="true" /> : <FaKey className="mt-0.5 shrink-0" aria-hidden="true" />}
            <span>{message}</span>
          </div>
        </div>
      )}

      {isSuccess ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-2xl text-[var(--income)]">
            <FaCheckCircle aria-hidden="true" />
          </div>
          <p className="text-base leading-relaxed text-[var(--text-muted)]" aria-live="polite">
            Redirecionando para o login em <strong className="text-[var(--foreground)]">{redirectTimer}</strong> segundos.
          </p>
          <Button as="a" href="/login" variant="outline" size="lg" fullWidth>
            Ir para o login agora
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <Input
              type={showPassword.novaSenha ? 'text' : 'password'}
              label="Nova senha"
              name="novaSenha"
              value={form.novaSenha}
              onChange={handleChange}
              placeholder="Digite a nova senha"
              error={errors.novaSenha}
              icon={<FaLock />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => ({ ...previous, novaSenha: !previous.novaSenha }))}
                  aria-label={showPassword.novaSenha ? 'Esconder nova senha' : 'Mostrar nova senha'}
                  title={showPassword.novaSenha ? 'Esconder nova senha' : 'Mostrar nova senha'}
                >
                  {showPassword.novaSenha ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                </button>
              }
              disabled={isLoading}
              autoComplete="new-password"
              required
            />

            <ul className="mt-3 grid gap-2 text-sm text-[var(--text-muted)] sm:grid-cols-3" aria-label="Requisitos da nova senha">
              {[
                ['length', '6+ caracteres'],
                ['uppercase', '1 maiúscula'],
                ['number', '1 número'],
              ].map(([key, label]) => {
                const met = requirements[key as keyof typeof requirements];
                return (
                  <li key={key} className={`flex items-center gap-2 ${met ? 'text-[var(--income)]' : ''}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${met ? 'border-[var(--income)] bg-[var(--primary-subtle)]' : 'border-[var(--border-strong)]'}`}>
                      {met && <FaCheck className="h-2.5 w-2.5" aria-hidden="true" />}
                    </span>
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>

          <Input
            type={showPassword.confirmarSenha ? 'text' : 'password'}
            label="Confirmar nova senha"
            name="confirmarSenha"
            value={form.confirmarSenha}
            onChange={handleChange}
            placeholder="Digite a senha novamente"
            error={errors.confirmarSenha}
            icon={<FaLock />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((previous) => ({ ...previous, confirmarSenha: !previous.confirmarSenha }))}
                aria-label={showPassword.confirmarSenha ? 'Esconder confirmação de senha' : 'Mostrar confirmação de senha'}
                title={showPassword.confirmarSenha ? 'Esconder confirmação de senha' : 'Mostrar confirmação de senha'}
              >
                {showPassword.confirmarSenha ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
              </button>
            }
            disabled={isLoading}
            autoComplete="new-password"
            required
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            icon={<FaKey />}
            iconPosition="right"
            isLoading={isLoading}
            loadingText="Atualizando..."
          >
            Redefinir senha
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
