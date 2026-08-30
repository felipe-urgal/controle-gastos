'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEnvelope, FaEye, FaEyeSlash, FaLock, FaSignInAlt } from 'react-icons/fa';

import { useAuth } from '@/app/context';
import AuthShell from '@/app/components/layout/auth-shell';
import { Button, Input } from '@/app/components/ui';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/contas');
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await login({ email: form.email, password: form.password });
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

  return (
    <AuthShell
      eyebrow="Acesso"
      title="Entrar na sua conta"
      description="Continue de onde parou e acesse suas contas, transações e calendário financeiro."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/signup">
            Criar conta
          </Link>
        </>
      }
    >
      {error && (
        <div role="alert" className="mb-5 rounded-[var(--radius-md)] border border-[var(--danger)]/45 bg-[var(--danger-subtle)] p-4 text-sm leading-relaxed text-[var(--expense)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
    </AuthShell>
  );
}
