"use client";

// Hooks
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Context
import { useAuth } from "@/app/context/AuthContext";
import { useThemeColors } from "@/app/hook/useThemeColors";

// Components
import Link from "next/link";
import { Input, Button } from '@/app/components'
import { Loading } from "@/app/components";

// Icons
import { FaEnvelope, FaLock, FaSignInAlt, FaEye, FaEyeSlash } from 'react-icons/fa';

// Toast
import { toast } from 'react-toastify';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (isAuthenticated) {
      toast.success('Login realizado com sucesso!');
      router.push("/calendario");
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

    setErrors({ email: "", password: "" });

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await login(form.email, form.password);
    } catch (error: unknown) {
      console.error("Erro no login:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Erro inesperado ao fazer login. Verifique suas credenciais.";

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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className={`flex justify-center items-center min-h-screen ${colors.bg.secondary}`}>
        <Loading/>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${colors.bg.secondary}`}>
      <div className={`w-full max-w-md transform transition-all duration-500 ${isMounted ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}>
        
        {/* Card Principal */}
        <div className={`${colors.bg.primary} rounded-2xl shadow-xl overflow-hidden ${colors.border.primary} border`}>
          
          {/* Header com Gradiente */}
          <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 py-6 px-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <FaSignInAlt className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Bem-vindo de volta</h1>
            <p className="text-white/90 text-sm">Faça login para acessar sua conta</p>
          </div>
          
          {/* Formulário */}
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Campo Email */}
              <div className="space-y-2">
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
                  icon={<FaEnvelope className="text-gray-400" />}
                  className={colors.input.focus.ring}
                />
              </div>
              
              {/* Campo Senha */}
              <div className="space-y-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  label="Senha"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  error={errors.password}
                  icon={<FaLock className="text-gray-400" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  }
                  className={colors.input.focus.ring}
                />
              </div>
              
              {/* Link Esqueci Senha */}
              <div className="flex justify-end">
                <Link 
                  href="/recuperar-senha" 
                  className={`text-sm font-medium ${colors.button.link.text} ${colors.button.link.extra} transition-colors duration-200`}
                >
                  Esqueceu a senha?
                </Link>
              </div>
              
              {/* Botão Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className={`w-full h-12 flex justify-center items-center rounded-xl text-base font-semibold ${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.button.primary.focus} transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg transform hover:-translate-y-0.5`}
                icon={isSubmitting ? undefined : <FaSignInAlt className="w-4 h-4" />}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processando...</span>
                  </div>
                ) : "Entrar"}
              </Button>

            </form>
            
            {/* Link Criar Conta */}
            <div className={`mt-8 pt-6 ${colors.border.primary} border-t`}>
              <p className={`text-center text-sm ${colors.text.secondary}`}>
                Não tem uma conta?{' '}
                <Link 
                  href="/criar-conta" 
                  className={`font-semibold ${colors.button.link.text} ${colors.button.link.extra} transition-colors duration-200`}
                >
                  Criar conta
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className={`text-xs ${colors.text.tertiary}`}>
            © {new Date().getFullYear()} Controle de Gastos. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}