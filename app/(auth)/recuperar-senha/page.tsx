"use client";

// Hooks
import { useState } from "react";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import Link from "next/link";
import { Input } from '@/app/components/ui/Input'
import { Button } from '@/app/components/ui/Button'

// Icons
import { FaEnvelope, FaCheckCircle, FaExclamationCircle, FaPaperPlane } from 'react-icons/fa';

export default function ForgotPasswordPage() {
  const { recoverPassword } = useAuth();

  const [form, setForm] = useState({ email: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "" });

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
      setMessage("Erro ao tentar recuperar senha.");
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-0 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-700 rounded-2xl shadow-xl overflow-hidden w-full max-w-md">
        <div className="bg-gray-600 py-6 px-8">
          <h1 className="text-gray-200 text-2xl font-bold text-center">Recuperar Senha</h1>
          <p className="text-gray-400 text-center mt-2">
            {success 
              ? "Verifique seu email para continuar" 
              : "Digite seu email para receber o link de recuperação"}
          </p>
        </div>
        
        <div className="p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-lg text-sm flex items-start ${
              success 
                ? "bg-transparent text-green-500 border border-green-500" 
                : "bg-transparent text-red-500 border border-red-500"
            }`}>
              <div className="mr-3">
                {success ? (
                  <FaCheckCircle className="text-green-500 w-5 h-5" />
                ) : (
                  <FaExclamationCircle className="text-red-500 w-5 h-5" />
                )}
              </div>
              <span>{message}</span>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Input
                  type='email'
                  label="Email cadastrado"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  loading={isLoading}
                  disabled={isLoading}
                  error={errors.email}
                  icon={<FaEnvelope />}
                />
              </div>

              <Button
                variant="default"
                type="submit"
                disabled={isLoading}
                className="mt-3 w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 hover:border-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                icon={<FaPaperPlane />}

              >
                {isLoading ? "Enviando..." : "Enviar Link de Recuperação"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              <Link href="/login" className="font-medium text-gray-300 hover:text-gray-500">
                Voltar para o login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}