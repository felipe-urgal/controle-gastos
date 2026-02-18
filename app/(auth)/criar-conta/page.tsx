"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context";
import Link from "next/link";
import { motion } from "framer-motion";
import { Input, Button, BackgroundParticles } from "@/app/components";
import { FaUserCircle, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errorsList, setErrorsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/contas");
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorsList.length) setErrorsList([]);  
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setErrorsList(["As senhas não coincidem"]);
      return;
    }

    setIsLoading(true);

    try {
      setErrorsList([]);

      await register(form);

      setTimeout(() => {
        router.push("/login");
      }, 1200);

    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar conta";

      const splitted = message.split(";").filter(Boolean);

      setErrorsList(splitted);
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if(password === '') return { label: "Fraca", color: "bg-red-500", width: "0%" };
    if (password.length < 6) return { label: "Fraca", color: "bg-red-500", width: "33%" };
    if (password.match(/[A-Z]/) && password.match(/[0-9]/))
      return { label: "Forte", color: "bg-green-500", width: "100%" };
    return { label: "Média", color: "bg-yellow-500", width: "66%" };
  };

  const strength = getPasswordStrength(form.password);

  return (
    <div className="min-h-screen flex relative overflow-hidden">

      <BackgroundParticles />

      {/* LEFT SIDE – BRANDING */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white overflow-hidden">

        <div className="relative group overflow-hidden">
          <div className="absolute -left-40 top-0 h-full w-40 bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-12 translate-x-[-200%] group-hover:translate-x-[300%] transition-transform duration-[2000ms]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative max-w-md px-10"
        >
          <h1 className="text-4xl font-bold leading-tight">
            Comece sua nova
            <span className="block mt-2 text-purple-300">
              organização financeira
            </span>
          </h1>

          <p className="mt-6 text-purple-100 text-lg">
            Controle gastos, acompanhe metas e tenha clareza total sobre seu dinheiro.
          </p>

          <div className="mt-12 p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10">
            <p className="text-sm text-purple-200 mb-2">Saldo atual</p>
            <p className="text-3xl font-semibold">R$ 1.450</p>
          </div>
        </motion.div>
      </div>

      {/* RIGHT SIDE – FORM */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950 px-6">

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative group w-full max-w-md p-10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]"
        >

          {/* Light Beam */}
          {/*<div className="absolute -left-40 top-0 h-full w-40 bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-12 translate-x-[-200%] group-hover:translate-x-[300%] transition-transform duration-[2000ms]" />*/}

          <div className="relative z-10">

            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">
                Criar conta
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                É rápido e gratuito
              </p>
            </div>

            {errorsList.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
              >
                <ul className="space-y-2 text-sm text-red-600 dark:text-red-400">
                  {errorsList.map((err, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-[3px] h-2 w-2 rounded-full bg-red-500" />
                      {err}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Input
                  label="Nome"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Seu nome"
                  icon={<FaUserCircle className="text-slate-400" />}
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  placeholder="••••••••"
                  icon={<FaLock className="text-slate-400" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  }
                  disabled={isLoading}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Input
                  type="password"
                  label="Confirmar senha"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  icon={<FaLock className="text-slate-400" />}
                  disabled={isLoading}
                />
              </motion.div>

              <div className="mt-2">
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: strength.width }}
                    transition={{ duration: 0.3 }}
                    className={`h-full ${strength.color}`}
                  />
                </div>
                <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                  Força da senha: {strength.label}
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="relative w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold overflow-hidden transition-all duration-300 hover:scale-[1.02]"
              >
                <span className="relative z-10">
                  {isLoading ? "Criando conta..." : "Criar conta"}
                </span>

                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-button-shine" />
              </Button>

            </form>

            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Já tem uma conta?{" "}
              <Link
                href="/login"
                className="relative group font-medium text-purple-600"
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
