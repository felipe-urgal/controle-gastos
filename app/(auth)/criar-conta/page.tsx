'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button, BackgroundParticles } from "@/app/components";
import { useStandalone } from "@/app/hook";
import {
  FaUserCircle,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();
  const { isStandalone } = useStandalone();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errorsList, setErrorsList] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/contas");
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Limpa erros específicos do campo
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [name]: "" }));
    }
    if (errorsList.length) setErrorsList([]);
  };

  const validateForm = () => {
    const errors = {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    };
    let isValid = true;

    // Validação do nome
    if (!form.name.trim()) {
      errors.name = "Nome é obrigatório";
      isValid = false;
    } else if (form.name.trim().length < 3) {
      errors.name = "Nome deve ter pelo menos 3 caracteres";
      isValid = false;
    }

    // Validação do email
    if (!form.email) {
      errors.email = "E-mail é obrigatório";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = "E-mail inválido";
      isValid = false;
    }

    // Validação da senha
    if (!form.password) {
      errors.password = "Senha é obrigatória";
      isValid = false;
    } else if (form.password.length < 6) {
      errors.password = "Senha deve ter pelo menos 6 caracteres";
      isValid = false;
    } else if (!/[A-Z]/.test(form.password)) {
      errors.password = "Senha deve conter pelo menos uma letra maiúscula";
      isValid = false;
    } else if (!/[0-9]/.test(form.password)) {
      errors.password = "Senha deve conter pelo menos um número";
      isValid = false;
    }

    // Validação da confirmação
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "As senhas não coincidem";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrorsList([]);

    try {
      await register(form);
      
      setRegistrationSuccess(true);
      
      // Redireciona após mostrar mensagem de sucesso
      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar conta";
      const splitted = message.split(";").filter(Boolean);
      setErrorsList(splitted);
      setIsLoading(false);
    }
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

  const strength = getPasswordStrength(form.password);

  // Margem condicional para o botão de voltar
  const backButtonTopClass = isStandalone ? 'top-16' : 'top-6';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <BackgroundParticles />
      </div>

      {/* Botão Voltar para Mobile - com margem condicional */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`absolute left-6 z-20 lg:hidden ${backButtonTopClass}`}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        >
          <FaArrowLeft size={16} />
          <span className="text-sm">Voltar</span>
        </Link>
      </motion.div>

      {/* LEFT SIDE – BRANDING (melhorado) */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white overflow-hidden">
        {/* Elementos decorativos */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
          
          {/* Círculos flutuantes */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-64 h-64 bg-white/5 rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, 20, 0],
              }}
              transition={{
                duration: 8 + i,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative max-w-md px-10 z-10"
        >
          {/* Logo animada */}
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-20 h-20 mb-8 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-2xl flex items-center justify-center shadow-2xl"
          >
            <span className="text-4xl font-bold text-white">$</span>
          </motion.div>

          <h1 className="text-5xl font-bold leading-tight">
            Comece sua nova
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300">
              organização financeira
            </span>
          </h1>

          <p className="mt-6 text-purple-100 text-lg leading-relaxed">
            Controle gastos, acompanhe metas e tenha clareza total sobre seu dinheiro em um só lugar.
          </p>

          {/* Lista de benefícios */}
          <div className="mt-8 space-y-4">
            {[
              "📊 Dashboard intuitivo",
              "📱 App disponível para iOS e Android",
              "🔒 Segurança de nível bancário",
              "🎯 Metas personalizadas"
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <FaCheckCircle className="text-purple-300 flex-shrink-0" />
                <span className="text-purple-100">{benefit}</span>
              </motion.div>
            ))}
          </div>

          {/* Card de estatísticas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-10 p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-200">Usuários ativos</p>
                <p className="text-2xl font-semibold">+10.000</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FaUserCircle size={24} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT SIDE – FORM (melhorado) */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950 px-4 sm:px-6 py-8 lg:py-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-full max-w-md"
        >
          <div className="relative p-6 sm:p-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]">
            
            {/* Header do formulário */}
            <div className="mb-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center"
              >
                <FaUserCircle className="text-white text-2xl" />
              </motion.div>
              
              <h2 className="text-2xl font-semibold tracking-tight">
                Criar conta gratuita
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Preencha os dados abaixo para começar
              </p>
            </div>

            {/* Mensagem de sucesso */}
            <AnimatePresence>
              {registrationSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
                >
                  <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                    <FaCheckCircle size={20} />
                    <span className="text-sm font-medium">
                      Conta criada com sucesso! Redirecionando...
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lista de erros */}
            <AnimatePresence>
              {errorsList.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
                >
                  <ul className="space-y-2 text-sm text-red-600 dark:text-red-400">
                    {errorsList.map((err, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <FaTimesCircle className="mt-0.5 flex-shrink-0" size={14} />
                        <span>{err}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Input
                  label="Nome completo"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Digite seu nome"
                  icon={<FaUserCircle className="text-slate-400" />}
                  disabled={isLoading || registrationSuccess}
                  error={fieldErrors.name}
                  autoComplete="name"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Input
                  type="email"
                  label="E-mail"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  icon={<FaEnvelope className="text-slate-400" />}
                  disabled={isLoading || registrationSuccess}
                  error={fieldErrors.email}
                  autoComplete="email"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Input
                  type={showPassword ? "text" : "password"}
                  label="Senha"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Crie uma senha segura"
                  icon={<FaLock className="text-slate-400" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                      aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                    >
                      {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  }
                  disabled={isLoading || registrationSuccess}
                  error={fieldErrors.password}
                  autoComplete="new-password"
                />
              </motion.div>

              {/* Indicador de força da senha */}
              {form.password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
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
                          <FaTimesCircle size={10} />
                        )}
                        <span>{req.text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  label="Confirmar senha"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Digite a senha novamente"
                  icon={<FaLock className="text-slate-400" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(prev => !prev)}
                      className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                      aria-label={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                    >
                      {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  }
                  disabled={isLoading || registrationSuccess}
                  error={fieldErrors.confirmPassword}
                  autoComplete="new-password"
                />
              </motion.div>

              {/* Botão principal */}
              <Button
                type="submit"
                disabled={isLoading || registrationSuccess}
                className="relative w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/25 disabled:opacity-70 disabled:hover:scale-100 disabled:hover:shadow-none"
                isLoading={isLoading}
              >
                {isLoading ? "Criando conta..." : "Criar conta gratuita"}
              </Button>
            </form>

            {/* Link para login */}
            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Já tem uma conta?{" "}
              <Link
                href="/login"
                className="relative group font-medium text-purple-600 hover:text-purple-700 transition-colors"
              >
                Faça login
                <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-purple-600 transition-all group-hover:w-full"></span>
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
