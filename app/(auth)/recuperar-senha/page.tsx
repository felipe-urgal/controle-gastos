"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { useAuth } from "@/app/context/AuthContext";
import { useThemeColors } from "@/app/hook/useThemeColors";

import Link from "next/link";
import { Input, Button } from '@/app/components'

import { FaEnvelope, FaCheckCircle, FaExclamationCircle, FaPaperPlane, FaArrowLeft } from 'react-icons/fa';

export default function ForgotPasswordPage() {
  const { recoverPassword, isAuthenticated } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  const [form, setForm] = useState({ email: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "" });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const { message } = await recoverPassword(form.email);
      setMessage(message);
    } catch (error) {
      setMessage("Erro ao tentar recuperar senha. Verifique se o e-mail está correto.");
      console.error("Erro completo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const success = message.includes("sucesso") || message.includes("enviado");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (message) setMessage("");
  };

  if (isAuthenticated) {
    router.push("/login");
    return null;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${colors.bg.secondary}`}>
      <div className={`w-full max-w-md transform transition-all duration-500 ${isMounted ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}>
        
        <div className={`${colors.bg.primary} rounded-2xl shadow-xl overflow-hidden ${colors.border.primary} border`}>
          
          <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 py-6 px-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <FaPaperPlane className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Recuperar Senha</h1>
            <p className="text-white/90 text-sm">
              {success 
                ? "Verifique sua caixa de entrada" 
                : "Digite seu e-mail para receber o link de recuperação"}
            </p>
          </div>
          
          <div className="px-6 py-8">
            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-start animate-fade-in ${
                success 
                  ? `${colors.colors.success.bg} ${colors.colors.success.text} ${colors.colors.success.border} border`
                  : `${colors.colors.error.bg} ${colors.colors.error.text} ${colors.colors.error.border} border`
              }`}>
                <div className="mr-3 mt-0.5">
                  {success ? (
                    <FaCheckCircle className="text-green-500 w-5 h-5 flex-shrink-0" />
                  ) : (
                    <FaExclamationCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
                  )}
                </div>
                <span className="text-sm">{message}</span>
              </div>
            )}

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-2">
                  <Input
                    type='email'
                    label="E-mail cadastrado"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                    loading={isLoading}
                    disabled={isLoading}
                    error={errors.email}
                    icon={<FaEnvelope className="text-gray-400" />}
                    className={colors.input.focus.ring}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full h-12 flex justify-center items-center rounded-xl text-base font-semibold ${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.button.primary.focus} transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg transform hover:-translate-y-0.5`}
                  icon={isLoading ? undefined : <FaPaperPlane className="w-4 h-4" />}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando...</span>
                    </div>
                  ) : "Enviar Link de Recuperação"}
                </Button>
              </form>
            ) : (
              <div className="text-center py-2 animate-fade-in">
                <div className="mb-6 flex justify-center">
                  <div className={`p-3 ${colors.colors.success.bg} rounded-full`}>
                    <FaCheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                </div>
                <p className={`${colors.text.secondary} mb-6`}>
                  Enviamos um link de recuperação para seu e-mail. Verifique sua caixa de entrada e a pasta de spam.
                </p>
              </div>
            )}

            <div className={`mt-8 pt-6 ${colors.border.primary} border-t text-center`}>
              <Link 
                href="/login" 
                className={`inline-flex items-center text-sm font-medium ${colors.button.link.text} ${colors.button.link.extra} transition-colors duration-200`}
              >
                <FaArrowLeft className="mr-2 h-3 w-3" />
                Voltar para o login
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className={`text-xs ${colors.text.tertiary}`}>
            © {new Date().getFullYear()} Controle de Gastos. Todos os direitos reservados.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}