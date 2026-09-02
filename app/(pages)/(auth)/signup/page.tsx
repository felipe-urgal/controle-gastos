'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaCheck,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaUser,
  FaUserPlus,
} from 'react-icons/fa';

import { useAuth } from '@/app/context';
import AuthShell from '@/app/components/layout/auth-shell';
import { Button, Input } from '@/app/components/ui';

export default function RegisterPage() {
  const { signup, isAuthenticated } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errorsList, setErrorsList] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace('/contas');
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  const requirements = {
    length: form.password.length >= 6,
    uppercase: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));

    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((previous) => ({ ...previous, [name]: '' }));
    }
    if (errorsList.length) setErrorsList([]);
  };

  const validateForm = () => {
    const errors = { name: '', email: '', password: '', confirmPassword: '' };
    let valid = true;

    if (!form.name.trim()) {
      errors.name = 'Nome é obrigatório';
      valid = false;
    } else if (form.name.trim().length < 3) {
      errors.name = 'Nome deve ter pelo menos 3 caracteres';
      valid = false;
    }

    if (!form.email) {
      errors.email = 'E-mail é obrigatório';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = 'E-mail inválido';
      valid = false;
    }

    if (!form.password) {
      errors.password = 'Senha é obrigatória';
      valid = false;
    } else if (!requirements.length) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
      valid = false;
    } else if (!requirements.uppercase) {
      errors.password = 'Senha deve conter pelo menos uma letra maiúscula';
      valid = false;
    } else if (!requirements.number) {
      errors.password = 'Senha deve conter pelo menos um número';
      valid = false;
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'Confirme sua senha';
      valid = false;
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem';
      valid = false;
    }

    setFieldErrors(errors);
    return valid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorsList([]);

    try {
      await signup({ name: form.name, email: form.email, password: form.password });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Erro ao criar conta';
      setErrorsList(message.split(';').map((item) => item.trim()).filter(Boolean));
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Cadastro"
      title="Criar sua conta"
      description="Comece com o essencial: seus dados de acesso. Depois você organiza contas, categorias e movimentações no seu ritmo."
      footer={
        <>
          Já tem uma conta?{' '}
          <Link className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/login">
            Entrar
          </Link>
        </>
      }
    >
      {errorsList.length > 0 && (
        <div role="alert" className="mb-5 rounded-[var(--radius-md)] border border-[var(--danger)]/45 bg-[var(--danger-subtle)] p-4 text-sm leading-relaxed text-[var(--expense)]">
          <ul className="space-y-1.5">
            {errorsList.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Nome completo"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Digite seu nome"
          icon={<FaUser />}
          disabled={isSubmitting}
          error={fieldErrors.name}
          autoComplete="name"
          enterKeyHint="next"
          required
        />

        <Input
          type="email"
          label="E-mail"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="seu@email.com"
          icon={<FaEnvelope />}
          disabled={isSubmitting}
          error={fieldErrors.email}
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
          autoCapitalize="none"
          spellCheck={false}
          required
        />

        <div>
          <Input
            type={showPassword ? 'text' : 'password'}
            label="Senha"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Crie uma senha"
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
            error={fieldErrors.password}
            autoComplete="new-password"
            enterKeyHint="next"
            required
          />

          <ul className="mt-3 grid gap-2 text-sm text-[var(--text-muted)] sm:grid-cols-3" aria-label="Requisitos da senha">
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
          type={showConfirmPassword ? 'text' : 'password'}
          label="Confirmar senha"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          placeholder="Digite a senha novamente"
          icon={<FaLock />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((previous) => !previous)}
              aria-label={showConfirmPassword ? 'Esconder confirmação de senha' : 'Mostrar confirmação de senha'}
              title={showConfirmPassword ? 'Esconder confirmação de senha' : 'Mostrar confirmação de senha'}
            >
              {showConfirmPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
            </button>
          }
          disabled={isSubmitting}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
          enterKeyHint="done"
          required
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          icon={<FaUserPlus />}
          iconPosition="right"
          isLoading={isSubmitting}
          loadingText="Criando conta..."
        >
          Criar conta
        </Button>
      </form>
    </AuthShell>
  );
}
