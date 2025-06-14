"use client";

// Hooks
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import Link from "next/link";
import { Input } from '@/app/components/ui/Input'
import { Button } from '@/app/components/ui/Button'

// Icons
import { FaEnvelope, FaLock, FaSignInAlt, FaExclamationCircle } from 'react-icons/fa';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
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
    }

    if (!form.password.trim()) {
      newErrors.password = 'Senha é obrigatório';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await login(form.email, form.password);
    } catch (error: unknown) {
      console.error("Erro no login:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Erro inesperado ao fazer login.";

      setError(errorMessage);
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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-0 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-700 rounded-2xl shadow-xl overflow-hidden w-full max-w-md">
        <div className="bg-gray-600 py-6 px-8">
          <h1 className="text-gray-200 text-2xl font-bold text-center">Bem-vindo de volta</h1>
          <p className="text-gray-400 text-center mt-2">Faça login para acessar sua conta</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 rounded-lg text-sm flex items-start bg-transparent text-red-500 border border-red-500">
              <div className="mr-3">
                <FaExclamationCircle className="text-red-500 w-5 h-5" />
              </div>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
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
            
            <div>
              <Input
                type='password'
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
            
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link href="/recuperar-senha" className="font-medium text-gray-500 hover:text-gray-800">
                  Esqueceu a senha?
                </Link>
              </div>
            </div>
            
            <Button
              variant="default"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 hover:border-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              icon={<FaSignInAlt />}
            >
              {isSubmitting ? "Processando..." : "Entrar"}
            </Button>

          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              Não tem uma conta?{' '}
              <Link href="/criar-conta" className="font-medium text-gray-500 hover:text-gray-800">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}