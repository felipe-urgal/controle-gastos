"use client";

// Hooks
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import Link from "next/link";
import { Input, Button } from '@/app/components'

// Icons
import { FaEnvelope, FaCheckCircle, FaExclamationCircle, FaPaperPlane, FaArrowLeft } from 'react-icons/fa';

export default function ForgotPasswordPage() {
  const { recoverPassword, isAuthenticated } = useAuth();
  const router = useRouter();

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
    <div className="min-h-dvh flex items-center justify-center">
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden w-full max-w-md transform transition-all duration-500 ${isMounted ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}>
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-4 px-4 lg:py-8 lg:px-8">
          <div className="flex justify-center lg:mb-4">
            <div className="p-2 lg:p-3 bg-white/10 rounded-full">
              <FaPaperPlane className="w-5 h-5 lg:h-8 lg:w-8 text-white" />
            </div>
          </div>
          <h1 className="text-white text-xl lg:text-2xl font-bold text-center">Recuperar Senha</h1>
          <p className="text-white/80 text-center lg:mt-2">
            {success 
              ? "Verifique sua caixa de entrada" 
              : "Digite seu e-mail para receber o link de recuperação"}
          </p>
        </div>
        
        <div className="px-4 pt-3 lg:p-8">
          {message && (
            <div className={`mb-3 p-2 lg:mb-6 lg:p-4 rounded-lg flex items-start animate-fade-in ${
              success 
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800" 
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
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
            <form onSubmit={handleSubmit} className="space-y-2 lg:space-y-5">
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
                icon={<FaEnvelope />}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg"
                icon={isLoading ? undefined : <FaPaperPlane />}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </div>
                ) : "Enviar Link de Recuperação"}
              </Button>
            </form>
          ) : (
            <div className="text-center py-2 animate-fade-in">
              <div className="mb-6 flex justify-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <FaCheckCircle className="h-12 w-12 text-green-500" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Enviamos um link de recuperação para seu e-mail. Verifique sua caixa de entrada e a pasta de spam.
              </p>
            </div>
          )}

          <div className="mt-4 text-center border-t border-gray-100 dark:border-gray-700">
            <Link 
              href="/login" 
              className="inline-flex items-center text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors duration-200"
            >
              <FaArrowLeft className="mr-2 h-3 w-3" />
              Voltar para o login
            </Link>
          </div>
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