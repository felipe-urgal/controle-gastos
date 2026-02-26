'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button, BackgroundParticles } from "@/app/components";
import { useStandalone } from "@/app/hook";
import {
  FaLock,
  FaKey,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowLeft,
  FaShieldAlt,
  FaEye,
  FaEyeSlash,
  FaClock,
  FaEnvelope
} from "react-icons/fa";

export default function ResetPasswordClient({
  token,
}: {
  token?: string;
}) {
  const router = useRouter();
  const { isStandalone } = useStandalone();

  const [form, setForm] = useState({
    novaSenha: "",
    confirmarSenha: "",
  });

  const [errors, setErrors] = useState({
    novaSenha: "",
    confirmarSenha: "",
  });

  const [showPassword, setShowPassword] = useState({
    novaSenha: false,
    confirmarSenha: false
  });

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [message, setMessage] = useState("");
  const [redirectTimer, setRedirectTimer] = useState(5);

  // Timer para redirecionamento após sucesso
  useEffect(() => {
    if (status === "success" && redirectTimer > 0) {
      const timer = setTimeout(() => {
        setRedirectTimer(redirectTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (status === "success" && redirectTimer === 0) {
      router.push("/login");
    }
  }, [status, redirectTimer, router]);

  const validateForm = () => {
    const newErrors = { novaSenha: "", confirmarSenha: "" };
    let isValid = true;

    if (!form.novaSenha) {
      newErrors.novaSenha = "Nova senha é obrigatória";
      isValid = false;
    } else if (form.novaSenha.length < 6) {
      newErrors.novaSenha = "Mínimo 6 caracteres";
      isValid = false;
    } else if (!/[A-Z]/.test(form.novaSenha)) {
      newErrors.novaSenha = "Deve conter uma letra maiúscula";
      isValid = false;
    } else if (!/[0-9]/.test(form.novaSenha)) {
      newErrors.novaSenha = "Deve conter um número";
      isValid = false;
    }

    if (!form.confirmarSenha) {
      newErrors.confirmarSenha = "Confirme sua senha";
      isValid = false;
    }

    if (
      form.novaSenha &&
      form.confirmarSenha &&
      form.novaSenha !== form.confirmarSenha
    ) {
      newErrors.confirmarSenha = "As senhas não coincidem";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const getPasswordStrength = (password: string) => {
    if (password === '') {
      return { 
        label: "Digite uma senha", 
        color: "bg-slate-300", 
        width: "0%",
        requirements: { length: false, uppercase: false, number: false }
      };
    }

    const hasLength = password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    const requirements = { length: hasLength, uppercase: hasUppercase, number: hasNumber };
    
    const metCount = [hasLength, hasUppercase, hasNumber].filter(Boolean).length;

    let label = "Fraca";
    let color = "bg-red-500";
    let width = "33%";

    if (metCount === 2) {
      label = "Média";
      color = "bg-yellow-500";
      width = "66%";
    } else if (metCount === 3) {
      label = "Forte";
      color = "bg-green-500";
      width = "100%";
    }

    return { label, color, width, requirements };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setStatus("error");
      setMessage(
        "Token inválido ou expirado. Solicite um novo link de recuperação."
      );
      return;
    }

    if (!validateForm()) return;

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha: form.novaSenha }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("Senha redefinida com sucesso!");
        setForm({ novaSenha: "", confirmarSenha: "" });
      } else {
        setStatus("error");
        setMessage(data.message || "Erro ao redefinir senha.");
      }
    } catch {
      setStatus("error");
      setMessage("Erro inesperado. Tente novamente.");
    }
  };

  const strength = getPasswordStrength(form.novaSenha);
  const backButtonTopClass = isStandalone ? 'top-6' : 'top-4';
  const isSuccess = status === "success";
  const isLoading = status === "loading";

  // Renderização condicional para token inválido
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/40 to-indigo-950/30 px-4 relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <BackgroundParticles />
        </div>

        {/* Elementos decorativos */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-slate-800">
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <FaExclamationTriangle className="text-red-500 text-4xl" />
              </div>
            </motion.div>

            <h2 className="text-2xl font-semibold text-center mb-3">
              Link inválido ou expirado
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">
              O link de recuperação que você usou não é mais válido. 
              Solicite um novo link para continuar.
            </p>

            <div className="space-y-4">
              <Link
                href="/forgot-password"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/25"
              >
                <FaEnvelope />
                Solicitar novo link
              </Link>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <FaArrowLeft />
                Voltar ao login
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/40 to-indigo-950/30 px-4 relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <BackgroundParticles />
      </div>

      {/* Elementos decorativos */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      {/* Botão Voltar para Mobile */}
      {!isSuccess && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`absolute left-4 z-10 lg:hidden ${backButtonTopClass}`}
        >
          <Link
            href="/login"
            className="flex items-center gap-2 text-slate-400 hover:text-purple-400 transition-colors"
          >
            <FaArrowLeft size={14} />
            <span className="text-xs">Voltar</span>
          </Link>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden">
          
          {/* Header com gradiente */}
          <div className="relative px-8 pt-10 pb-6 text-center bg-gradient-to-b from-transparent to-purple-500/5">
            
            {/* Ícone animado */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="flex justify-center mb-4"
            >
              <div className={`
                w-16 h-16 rounded-2xl
                bg-gradient-to-br from-purple-600 to-indigo-600
                flex items-center justify-center
                shadow-lg shadow-purple-500/30
                ${isSuccess ? 'from-green-500 to-green-600' : ''}
              `}>
                {isSuccess ? (
                  <FaCheckCircle className="text-white text-2xl" />
                ) : (
                  <FaKey className="text-white text-2xl" />
                )}
              </div>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-semibold text-slate-800 dark:text-slate-100"
            >
              {isSuccess ? "Senha redefinida!" : "Redefinir senha"}
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-slate-500 dark:text-slate-400 mt-2"
            >
              {isSuccess
                ? "Agora você já pode acessar sua conta"
                : "Digite sua nova senha abaixo"}
            </motion.p>
          </div>

          <div className="px-8 pb-10">
            
            {/* Mensagem de feedback */}
            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  key={message}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`
                    mb-6 p-4 rounded-xl border text-sm flex items-start gap-3
                    ${isSuccess
                      ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                      : "bg-red-500/10 border-red-500/30 text-red-500 dark:text-red-400"}
                  `}
                >
                  {isSuccess ? (
                    <FaCheckCircle className="mt-0.5 flex-shrink-0" />
                  ) : (
                    <FaExclamationTriangle className="mt-0.5 flex-shrink-0" />
                  )}
                  <span>{message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulário */}
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  {/* Campo Nova Senha */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nova senha
                    </label>
                    <Input
                      type={showPassword.novaSenha ? "text" : "password"}
                      name="novaSenha"
                      value={form.novaSenha}
                      onChange={handleChange}
                      error={errors.novaSenha}
                      icon={<FaLock className="text-slate-400" />}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword(prev => ({ 
                            ...prev, 
                            novaSenha: !prev.novaSenha 
                          }))}
                          className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                          aria-label={showPassword.novaSenha ? "Esconder senha" : "Mostrar senha"}
                        >
                          {showPassword.novaSenha ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                        </button>
                      }
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>

                  {/* Indicador de força da senha */}
                  {form.novaSenha && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2 -mt-2"
                    >
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: strength.width }}
                          transition={{ duration: 0.3 }}
                          className={`h-full ${strength.color}`}
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {[
                          { key: 'length', text: '6+ caracteres' },
                          { key: 'uppercase', text: 'Maiúscula' },
                          { key: 'number', text: 'Número' }
                        ].map((req) => (
                          <div
                            key={req.key}
                            className={`flex items-center gap-1 ${
                              strength.requirements[req.key as keyof typeof strength.requirements]
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {strength.requirements[req.key as keyof typeof strength.requirements] ? (
                              <FaCheckCircle size={10} />
                            ) : (
                              <FaExclamationTriangle size={10} />
                            )}
                            <span>{req.text}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Campo Confirmar Senha */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Confirmar senha
                    </label>
                    <Input
                      type={showPassword.confirmarSenha ? "text" : "password"}
                      name="confirmarSenha"
                      value={form.confirmarSenha}
                      onChange={handleChange}
                      error={errors.confirmarSenha}
                      icon={<FaLock className="text-slate-400" />}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword(prev => ({ 
                            ...prev, 
                            confirmarSenha: !prev.confirmarSenha 
                          }))}
                          className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                          aria-label={showPassword.confirmarSenha ? "Esconder senha" : "Mostrar senha"}
                        >
                          {showPassword.confirmarSenha ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                        </button>
                      }
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>

                  {/* Dica de segurança */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10"
                  >
                    <div className="flex items-start gap-2 text-xs text-purple-600 dark:text-purple-400">
                      <FaShieldAlt className="mt-0.5 flex-shrink-0" />
                      <span>
                        Escolha uma senha forte com letras maiúsculas, 
                        números e pelo menos 6 caracteres.
                      </span>
                    </div>
                  </motion.div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-500/25 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100"
                    isLoading={isLoading}
                  >
                    {isLoading ? "Redefinindo..." : "Redefinir senha"}
                  </Button>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center space-y-6"
                >
                  {/* Ícone de sucesso animado */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="flex justify-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                      <FaCheckCircle className="text-green-500 text-4xl" />
                    </div>
                  </motion.div>

                  {/* Timer de redirecionamento */}
                  <div className="space-y-3">
                    <p className="text-slate-600 dark:text-slate-400">
                      Você será redirecionado para o login em:
                    </p>
                    
                    <div className="flex items-center justify-center gap-2">
                      <FaClock className="text-purple-600" />
                      <span className="text-2xl font-bold text-purple-600">
                        {redirectTimer}s
                      </span>
                    </div>
                  </div>

                  {/* Botão manual */}
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:scale-[1.02] transition-all duration-300"
                  >
                    <FaArrowLeft />
                    Ir para o login agora
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Links adicionais */}
            {!isSuccess && (
              <div className="mt-6 pt-6 border-t border-white/20 dark:border-slate-800">
                <div className="flex flex-col items-center gap-3">
                  <Link
                    href="/login"
                    className="text-sm text-purple-600 hover:text-purple-700 transition-colors inline-flex items-center gap-2 group"
                  >
                    <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" />
                    Voltar para o login
                  </Link>

                  <Link
                    href="/forgot-password"
                    className="text-xs text-slate-500 hover:text-purple-600 transition-colors"
                  >
                    Solicitar novo link de recuperação
                  </Link>
                </div>
              </div>
            )}

            {/* Selo de segurança */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400"
            >
              <FaShieldAlt />
              <span>Conexão segura • Dados criptografados</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}