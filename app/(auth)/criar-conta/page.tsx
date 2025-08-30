"use client";

// Hooks
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Contexts
import { useAuth } from "@/app/context/AuthContext";

// Components
import Link from "next/link";
import { Input, Button } from '@/app/components'

// Icons
import { FaUserCircle, FaEnvelope, FaLock, FaUserPlus, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa"; 

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const validateForm = () => {
    let valid = true;
    const newErrors = { name: "", email: "", password: "", confirmPassword: "" };

    if (!form.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
      valid = false;
    } else if (form.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
      valid = false;
    }

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
    } else if (form.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
      valid = false;
    }

    if (!form.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirmar Senha é obrigatória';
      valid = false;
    }

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
      newErrors.password = 'As senhas não coincidem';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear specific error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await register(form.name, form.email, form.password);
      setMessage("Usuário criado com sucesso! Redirecionando para login...");
      setTimeout(() => {
        setIsLoading(false);
        router.push("/login");
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    }
  };

  if (isAuthenticated) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden w-full max-w-md transform transition-all duration-500 ${isMounted ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}>
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-8 px-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/10 rounded-full">
              <FaUserPlus className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold text-center">Crie sua conta</h1>
          <p className="text-white/80 text-center mt-2">Preencha os campos para se registrar</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 flex items-start animate-fade-in">
              <FaExclamationTriangle className="flex-shrink-0 h-5 w-5 mr-3 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800 flex items-start animate-fade-in">
              <FaCheckCircle className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5" />
              <div className="ml-3">
                <p className="font-medium">{message}</p>
              </div>
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nome completo"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Seu nome completo"
                loading={isLoading}
                disabled={isLoading}
                error={errors.name}
                icon={<FaUserCircle />}
              />

              <Input
                type='email'
                label="E-mail"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                loading={isLoading}
                disabled={isLoading}
                error={errors.email}
                icon={<FaEnvelope />}
              />

              <Input
                type='password'
                label="Senha"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                loading={isLoading}
                disabled={isLoading}
                error={errors.password}
                icon={<FaLock />}
              />

              <Input
                type='password'
                label="Confirmar Senha"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                loading={isLoading}
                disabled={isLoading}
                error={errors.confirmPassword}
                icon={<FaLock />}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg"
                icon={<FaUserPlus />}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Criando conta...
                  </div>
                ) : "Criar Conta"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Já tem uma conta?{' '}
              <Link 
                href="/login" 
                className="font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors duration-200"
              >
                Faça login
              </Link>
            </p>
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