"use client";

// Hooks
import { useState } from "react";
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

  const validateForm = () => {
    let valid = true;
    const newErrors = { name: "", email: "", password: "", confirmPassword: "" };

    if (!form.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
      valid = false;
    }

    if (!form.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
      valid = false;
    }

    if (!form.password.trim()) {
      newErrors.password = 'Senha é obrigatório';
      valid = false;
    }

    if (!form.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirmar Senha é obrigatório';
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
    setErrors(prev => ({ ...prev, [name]: '' }));
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
      setMessage("Usuário criado com sucesso!");
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-0 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-700 rounded-2xl shadow-xl overflow-hidden w-full max-w-md">
        <div className="bg-gray-600 py-6 px-8">
          <h1 className="text-gray-200 text-2xl font-bold text-center">Crie sua conta</h1>
          <p className="text-gray-400 text-center mt-2">Preencha os campos para se registrar</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start">
              <FaExclamationTriangle className="flex-shrink-0 h-5 w-5 mr-3 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 flex items-start">
              <FaCheckCircle className="flex-shrink-0 h-5 w-5 mt-0.5 text-green-500" />
              <div className="ml-3">
                <p className="font-medium">{message}</p>
              </div>
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit} className="space-y-3">
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
                variant="default"
                type="submit"
                disabled={isLoading}
                className="mt-3 w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 hover:border-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                icon={<FaUserPlus />}
              >
                {isLoading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              Já tem uma conta?{' '}
              <Link href="/login" className="font-medium text-gray-500 hover:text-gray-800">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}