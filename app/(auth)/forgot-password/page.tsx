'use client';

// importing hooks
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useStandalone } from "@/app/hook";

// importing context
import { useAuth } from "@/app/context";

// importing components
import Link from "next/link";
import { Input, Button } from '@/app/components/ui';
import { BackgroundParticles } from '@/app/components/layout';

// importing icons
import { FaEnvelope, FaCheckCircle, FaArrowLeft, FaTimesCircle, FaShieldAlt, FaLock, FaQuestionCircle, FaClock } from 'react-icons/fa';

export default function ForgotPasswordPage() {
  const { forgotPassword, isAuthenticated } = useAuth();
  const router = useRouter();
  const { isStandalone } = useStandalone();

  const [form, setForm] = useState({ email: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "" });
  const [resendTimer, setResendTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/contas");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const validateForm = () => {
    let valid = true;
    const newErrors = { email: "" };

    if (!form.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'E-mail inválido';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Limitar tentativas (rate limiting)
    if (attempts >= 3) {
      setMessage("Muitas tentativas. Aguarde alguns minutos.");
      return;
    }
    
    setIsLoading(true);
    setMessage("");

    try {
      const result = await forgotPassword(form.email);
      
      setMessage(result.message);
      setAttempts(prev => prev + 1);
      setResendTimer(60); // 60 segundos para reenvio
      
    } catch {
      setMessage("Erro inesperado ao tentar recuperar senha. Tente novamente.");
      setAttempts(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (message) setMessage("");
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    setMessage("");

    try {
      const result = await forgotPassword(form.email);
      setMessage(result.message);
      setResendTimer(60);
    } catch {
      setMessage("Erro ao reenviar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const success = message.includes("sucesso") || 
                  message.includes("enviado") || 
                  message.includes("E-mail de recuperação");

  const backButtonTopClass = isStandalone ? 'top-16' : 'top-6';

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-950 via-purple-950/40 to-indigo-950/30 relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <BackgroundParticles />
      </div>

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className={`absolute left-4 z-10 lg:hidden ${backButtonTopClass}`}>
        <Link
          href="/login"
          className="flex items-center gap-2 text-slate-400 hover:text-purple-400 transition-colors"
        >
          <FaArrowLeft size={14} />
          <span className="text-xs">Voltar</span>
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-slate-800 rounded-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="relative px-8 pt-10 pb-6 text-center bg-gradient-to-b from-transparent to-purple-500/5">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                {success ? (
                  <FaCheckCircle className="text-white text-2xl" />
                ) : (
                  <FaLock className="text-white text-2xl" />
                )}
              </div>
            </div>

            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
              {success ? "E-mail enviado!" : "Recuperar Senha"}
            </h1>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {success
                ? "Verifique sua caixa de entrada"
                : "Digite seu e-mail para receber o link de recuperação"}
            </p>
          </div>

          <div className="px-8 pb-10">
            {message && (
              <div className={`mb-6 p-4 rounded-2xl border text-sm ${success ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400" : "bg-red-500/10 border-red-500/30 text-red-500 dark:text-red-400"}`}>
                <div className="flex items-start gap-3">
                  {success ? (
                    <FaCheckCircle className="mt-0.5 flex-shrink-0" />
                  ) : (
                    <FaTimesCircle className="mt-0.5 flex-shrink-0" />
                  )}
                  <span>{message}</span>
                </div>
              </div>
            )}

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2 mt-4">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    E-mail cadastrado
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                    disabled={isLoading}
                    error={errors.email}
                    icon={<FaEnvelope className="text-gray-400" />}
                    className="w-full"
                  />
                </div>

                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <div className="flex items-start gap-2 text-xs text-purple-600 dark:text-purple-400">
                    <FaShieldAlt className="mt-0.5 flex-shrink-0" />
                    <span>
                      Enviaremos um link seguro para seu e-mail. 
                      Verifique também sua caixa de spam.
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || attempts >= 3}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-lg shadow-purple-500/25 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100"
                  isLoading={isLoading}
                >
                  {isLoading ? "Enviando..." : "Enviar Link de Recuperação"}
                </Button>

                {attempts > 0 && attempts < 3 && (
                  <p className="text-xs text-center text-slate-500">
                    Tentativa {attempts} de 3
                  </p>
                )}

                {attempts >= 3 && (
                  <p className="text-xs text-center text-red-500">
                    Muitas tentativas. Aguarde alguns minutos.
                  </p>
                )}
              </form>
            ) : (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                    <FaCheckCircle className="text-green-500 text-4xl" />
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <p className="text-slate-600 dark:text-slate-400">
                    Enviamos um link de recuperação para:
                  </p>
                  <p className="font-medium text-purple-600 dark:text-purple-400">
                    {form.email}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    O link expira em 1 hora por segurança.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FaClock className="text-slate-400" />
                    {resendTimer > 0 ? (
                      <span className="text-slate-600 dark:text-slate-400">
                        Reenviar em {resendTimer} segundos
                      </span>
                    ) : (
                      <button
                        onClick={handleResend}
                        disabled={isLoading}
                        className="
                          text-purple-600 hover:text-purple-700 
                          font-medium transition-colors
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                      >
                        {isLoading ? "Enviando..." : "Reenviar e-mail"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-xs text-yellow-600 dark:text-yellow-500">
                  <FaQuestionCircle className="mt-0.5 flex-shrink-0" />
                  <span>
                    Não encontrou o e-mail? Verifique sua pasta de spam 
                    ou adicione nosso endereço aos contatos.
                  </span>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-white/20 dark:border-slate-800">
              <div className="flex flex-col items-center gap-4">
                <Link
                  href="/login"
                  className="text-sm text-purple-600 hover:text-purple-700 transition-colors inline-flex items-center gap-2 group"
                >
                  <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" />
                  Voltar para o login
                </Link>

                <Link
                  href="/signup"
                  className="text-xs text-slate-500 hover:text-purple-600 transition-colors"
                >
                  Não tem uma conta? <span className="font-medium">Criar conta</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
