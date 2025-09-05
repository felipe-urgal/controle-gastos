"use client";

// Hooks
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import Link from "next/link";
import { Input, Button } from '@/app/components'
import { Loading } from "@/app/components";

// Icons
import { FaEnvelope, FaLock, FaSignInAlt } from 'react-icons/fa';

// Toast
import { toast } from 'react-toastify';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (isAuthenticated) {
      // Toast de boas-vindas ao ser redirecionado
      toast.success('Login realizado com sucesso!');
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      email: "",
      password: "",
    };

    if (!form.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'E-mail inválido';
      valid = false;
    }

    if (!form.password.trim()) {
      newErrors.password = 'Senha é obrigatória';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpa erros anteriores
    setErrors({ email: "", password: "" });

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await login(form.email, form.password);
      // O toast de sucesso será mostrado no useEffect quando isAuthenticated mudar
    } catch (error: unknown) {
      console.error("Erro no login:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Erro inesperado ao fazer login. Verifique suas credenciais.";

      // Toast de erro
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-dvh">
        <Loading/>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden w-full max-w-md transform transition-all duration-500 ${isMounted ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}>
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-8 px-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/10 rounded-full">
              <FaSignInAlt className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold text-center">Bem-vindo de volta</h1>
          <p className="text-white/80 text-center mt-2">Faça login para acessar sua conta</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                type='email'
                label="E-mail"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                loading={isSubmitting}
                disabled={isSubmitting}
                error={errors.email}
                icon={<FaEnvelope />}
              />
            </div>
            
            <div className="relative">
              <Input
                type="password"
                label="Senha"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                loading={isSubmitting}
                disabled={isSubmitting}
                error={errors.password}
                icon={<FaLock />}
              />
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm">
                <Link 
                  href="/recuperar-senha" 
                  className="font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors duration-200"
                >
                  Esqueceu a senha?
                </Link>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg"
              icon={isSubmitting ? undefined : <FaSignInAlt />}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </div>
              ) : "Entrar"}
            </Button>

          </form>
          
          <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Não tem uma conta?{' '}
              <Link 
                href="/criar-conta" 
                className="font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors duration-200"
              >
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}