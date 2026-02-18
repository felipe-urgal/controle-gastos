"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context";
import Link from "next/link";
import { Input, Button } from '@/app/components'
import { FaEnvelope, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';

export default function ForgotPasswordPage() {
  const { recoverPassword, isAuthenticated } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ email: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "" });

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/contas");
    }
  }, [isAuthenticated, router]);

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
    
    setIsLoading(true);
    setMessage("");

    try {
      const result = await recoverPassword(form.email);
      
      setMessage(result.message);
      
    } catch (error) {
      console.error("Erro completo:", error);
      setMessage("Erro inesperado ao tentar recuperar senha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const success = message.includes("sucesso") || 
                  message.includes("enviado") || 
                  message.includes("E-mail de recuperação");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (message) setMessage("");
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gradient-to-br from-slate-950 via-purple-950/40 to-indigo-950/30">

      <div className="
        w-full max-w-md
        bg-white/70 dark:bg-slate-900/70
        backdrop-blur-2xl
        border border-white/20 dark:border-slate-800
        rounded-3xl
        shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]
        overflow-hidden
      ">

        {/* Header */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="
              w-14 h-14 rounded-2xl
              bg-gradient-to-br from-purple-600 to-indigo-600
              flex items-center justify-center
              shadow-lg
            ">
              <FaEnvelope className="text-white text-lg" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
            Recuperar Senha
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {success
              ? "Verifique sua caixa de entrada"
              : "Digite seu e-mail para receber o link de recuperação"}
          </p>
        </div>

        <div className="px-8 pb-10">

          {/* Feedback */}
          {message && (
            <div className={`
              mb-6 p-4 rounded-2xl border text-sm
              ${success
                ? "bg-green-500/10 border-green-500/30 text-green-600"
                : "bg-red-500/10 border-red-500/30 text-red-500"}
            `}>
              {message}
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">

              <Input
                type="email"
                label="E-mail cadastrado"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                disabled={isLoading}
                error={errors.email}
                icon={<FaEnvelope className="text-gray-400" />}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="
                  w-full h-12 rounded-xl
                  bg-gradient-to-r from-purple-600 to-indigo-600
                  text-white font-medium
                  shadow-lg
                  hover:scale-[1.02]
                  transition-all duration-300
                  disabled:opacity-60
                "
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </div>
                ) : (
                  "Enviar Link de Recuperação"
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="flex justify-center">
                <div className="
                  w-16 h-16 rounded-full
                  bg-green-500/10
                  flex items-center justify-center
                ">
                  <FaCheckCircle className="text-green-500 text-3xl" />
                </div>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Caso não encontre o e-mail, verifique sua pasta de spam.
              </p>

              <button
                onClick={() => {
                  setMessage("");
                }}
                className="text-sm font-medium text-purple-600 hover:underline"
              >
                Reenviar
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="mt-10 pt-6 border-t border-white/20 dark:border-slate-800 text-center">
            <Link
              href="/login"
              className="text-sm text-purple-600 hover:underline inline-flex items-center gap-2"
            >
              <FaArrowLeft className="text-xs" />
              Voltar para o login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}