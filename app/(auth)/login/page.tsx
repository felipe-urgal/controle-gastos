"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context";
import Link from "next/link";
import { motion } from "framer-motion";
import { Input, Button, BackgroundParticles } from "@/app/components";
import {
  FaEnvelope,
  FaLock,
  FaSignInAlt,
  FaEye,
  FaEyeSlash
} from "react-icons/fa";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/contas");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError("");
    setErrors({ email: "", password: "" });

    try {
      await login({
        email: form.email,
        password: form.password,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao fazer login";

      if (errorMessage.includes(";")) {
        const splitted = errorMessage
          .split(";")
          .map(e => e.trim())
          .filter(Boolean);

        const fieldErrors = {
          email: "",
          password: "",
        };

        splitted.forEach(message => {
          if (message.toLowerCase().includes("e-mail")) {
            fieldErrors.email = message;
          }
          if (message.toLowerCase().includes("senha")) {
            fieldErrors.password = message;
          }
        });

        setErrors(fieldErrors);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      <BackgroundParticles />

      {/* LEFT SIDE – BRANDING */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white overflow-hidden">

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative max-w-md px-10"
        >
          <h1 className="text-4xl font-bold leading-tight">
            Bem-vindo de volta
            <span className="block mt-2 text-purple-300">
              à sua organização financeira
            </span>
          </h1>

          <p className="mt-6 text-purple-100 text-lg">
            Acesse sua conta e continue controlando seus gastos com clareza e simplicidade.
          </p>

          <div className="mt-12 p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10">
            <p className="text-sm text-purple-200 mb-2">
              Controle total
            </p>
            <p className="text-3xl font-semibold">
              Simples • Seguro • Inteligente
            </p>
          </div>
        </motion.div>
      </div>

      {/* RIGHT SIDE – FORM */}
      <div className="flex items-center justify-center w-full lg:w-[480px] p-8">

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md p-10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/20 dark:border-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]"
        >

          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Entrar na conta
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Continue de onde parou
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-3 text-sm rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <Input
              type="email"
              label="E-mail"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              icon={<FaEnvelope className="text-slate-400" />}
              disabled={isSubmitting}
              error={errors.email}
            />

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
              disabled={isSubmitting}
              error={errors.password}
            />

            <div className="flex justify-end">
              <Link
                href="/recuperar-senha"
                className="text-sm font-medium text-purple-600 hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="relative w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold overflow-hidden transition-all duration-300 hover:scale-[1.02]"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSubmitting ? "Entrando..." : "Entrar"}
                {!isSubmitting && <FaSignInAlt />}
              </span>

              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-button-shine" />
            </Button>

          </form>

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Não tem uma conta?{" "}
            <Link
              href="/criar-conta"
              className="relative group font-medium text-purple-600"
            >
              Criar conta
              <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-purple-600 transition-all group-hover:w-full"></span>
            </Link>
          </p>

        </motion.div>
      </div>
    </div>
  );
}
