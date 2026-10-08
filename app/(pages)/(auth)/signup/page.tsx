'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaCheck,
  FaCheckCircle,
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
import { getEmailError, getNameError } from '@/app/lib/auth/credential-rules';
import { resolvePostLoginPath } from '@/app/lib/auth/protected-routes';
import { authService } from '@/app/services/auth-service';
import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENT_LABEL, getPasswordRuleError } from '@/app/lib/auth/password-rules';

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
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace(resolvePostLoginPath(window.location.search));
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  const passwordRuleError = getPasswordRuleError(form.password);
  const requirementMet = form.password.length >= PASSWORD_MIN_LENGTH && !passwordRuleError;

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

    const nameError = getNameError(form.name);
    if (nameError) {
      errors.name = nameError;
      valid = false;
    }

    const emailError = getEmailError(form.email);
    if (emailError) {
      errors.email = emailError;
      valid = false;
    }

    if (!form.password) {
      errors.password = 'Senha é obrigatória';
      valid = false;
    } else if (passwordRuleError) {
      errors.password = passwordRuleError;
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
      setSubmittedEmail(form.email.trim().toLowerCase());
      setForm({ name: '', email: '', password: '', confirmPassword: '' });
      setIsSubmitting(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Erro ao criar conta';
      setErrorsList(message.split(';').map((item) => item.trim()).filter(Boolean));
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!submittedEmail) return;
    setResendState('sending');
    try {
      await authService.resendVerification(submittedEmail);
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  if (submittedEmail) {
    return (
      <AuthShell
        eyebrow="Cadastro"
        title="Confira seu e-mail"
        description="Para entrar, confirme seu e-mail usando o link que enviarmos. Sem essa confirmação o login não funcionará."
        backHref="/login"
        backLabel="Ir para o login"
      >
        <div role="status" className="mb-5 flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--primary)]/40 bg-[var(--primary-subtle)] p-4 text-sm leading-relaxed text-[var(--foreground)]">
          <FaCheckCircle className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
          <span>
            Se for possível concluir o cadastro, enviaremos um link de verificação para{' '}
            <strong className="break-all">{submittedEmail}</strong>. O link vale por 24 horas.
          </span>
        </div>

        {resendState === 'sent' && (
          <p role="status" className="mb-4 text-sm text-[var(--text-muted)]">
            Se houver um cadastro pendente, enviaremos um novo link.
          </p>
        )}
        {resendState === 'error' && (
          <p role="alert" className="mb-4 text-sm text-[var(--expense)]">
            Não foi possível solicitar o reenvio agora. Tente novamente mais tarde.
          </p>
        )}

        <div className="grid gap-3">
          <Button as="a" href="/login" fullWidth size="lg">
            Ir para o login
          </Button>
          <Button
            type="button"
            variant="outline"
            fullWidth
            size="lg"
            onClick={() => void handleResend()}
            isLoading={resendState === 'sending'}
            loadingText="Enviando..."
          >
            Reenviar verificação
          </Button>
        </div>
      </AuthShell>
    );
  }

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
            autoCapitalize="none"
            spellCheck={false}
            required
          />

          <p className={`mt-3 flex items-center gap-2 text-sm ${requirementMet ? 'text-[var(--income)]' : 'text-[var(--text-muted)]'}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${requirementMet ? 'border-[var(--income)] bg-[var(--primary-subtle)]' : 'border-[var(--border-strong)]'}`}>
              {requirementMet && <FaCheck className="h-2.5 w-2.5" aria-hidden="true" />}
            </span>
            {PASSWORD_REQUIREMENT_LABEL}
          </p>
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
          autoCapitalize="none"
          spellCheck={false}
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
