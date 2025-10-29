"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context";
import { useThemeColors } from "@/app/hook";
import Link from "next/link";
import { Input, Button } from '@/app/components'
import { FaUserCircle, FaEnvelope, FaLock, FaUserPlus, FaExclamationTriangle, FaCheckCircle, FaEye, FaEyeSlash } from "react-icons/fa"; 

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    confirmPassword: "" 
  });
  const [errors, setErrors] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    confirmPassword: "" 
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    let valid = true;
    const newErrors = { 
      name: "", 
      email: "", 
      password: "", 
      confirmPassword: "" 
    };

    if (!form.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
      valid = false;
    } else if (form.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
      valid = false;
    } else if (form.name.trim().length > 100) {
      newErrors.name = 'Nome não pode exceder 100 caracteres';
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
    } else if (form.password.length > 100) {
      newErrors.password = 'Senha não pode exceder 100 caracteres';
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
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setMessage("");

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
      const errorMessage = err instanceof Error ? err.message : "Erro ao criar conta";
      setError(errorMessage);
      
      if (errorMessage.includes("E-mail já está em uso")) {
        setErrors(prev => ({ ...prev, email: errorMessage }));
      } else if (errorMessage.includes("Nome") || errorMessage.includes("Senha")) {
        const validationErrors = errorMessage.split(';');
        validationErrors.forEach(errorText => {
          if (errorText.includes('Nome')) {
            setErrors(prev => ({ ...prev, name: errorText.trim() }));
          } else if (errorText.includes('E-mail')) {
            setErrors(prev => ({ ...prev, email: errorText.trim() }));
          } else if (errorText.includes('Senha')) {
            setErrors(prev => ({ ...prev, password: errorText.trim() }));
          }
        });
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/calendario");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className={`fixed inset-0 ${colors.bg.secondary} flex items-center sm:items-center justify-center z-50 p-0 animate-fade-in safe-area-container`}>
      <div 
        className={`
          ${colors.bg.modal} w-full h-full sm:max-w-[50vh] sm:max-h-[85vh] sm:mx-4 overflow-hidden flex flex-col 
          animate-slide-up-mobile sm:animate-slide-up justify-between
          modal-fullscreen-mobile calendar-mobile-fullscreen sm:rounded-3xl
        `}
      >
        <div className={`${colors.bg.primary} overflow-hidden ${colors.border.primary}`}>
          
          <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 py-6 px-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <FaUserPlus className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Crie sua conta</h1>
            <p className="text-white/90 text-sm">Preencha os campos para se registrar</p>
          </div>
          
          <div className="px-6 py-3">
            {error && !message && (
              <div className={`mb-6 p-4 ${colors.colors.error.bg} ${colors.colors.error.text} rounded-lg ${colors.colors.error.border} border flex items-start animate-fade-in`}>
                <FaExclamationTriangle className="flex-shrink-0 h-5 w-5 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium">Erro no registro</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {message && (
              <div className={`mb-6 p-4 ${colors.colors.success.bg} ${colors.colors.success.text} rounded-lg ${colors.colors.success.border} border flex items-start animate-fade-in`}>
                <FaCheckCircle className="flex-shrink-0 h-5 w-5 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium">Sucesso!</p>
                  <p className="text-sm mt-1">{message}</p>
                </div>
              </div>
            )}

            {!message && (
              <form onSubmit={handleSubmit} className="space-y-3">
                
                <div className="space-y-2">
                  <Input
                    label="Nome completo"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Seu nome completo"
                    loading={isLoading}
                    disabled={isLoading}
                    error={errors.name}
                    icon={<FaUserCircle className="text-gray-400" />}
                    className={colors.input.focus.ring}
                  />
                </div>

                <div className="space-y-2">
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
                    icon={<FaEnvelope className="text-gray-400" />}
                    className={colors.input.focus.ring}
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    label="Senha"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    loading={isLoading}
                    disabled={isLoading}
                    error={errors.password}
                    icon={<FaLock className="text-gray-400" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        disabled={isLoading}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    }
                    className={colors.input.focus.ring}
                  />
                  <p className={`text-xs ${colors.text.tertiary} mt-1`}>
                    Mínimo 6 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    label="Confirmar Senha"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    loading={isLoading}
                    disabled={isLoading}
                    error={errors.confirmPassword}
                    icon={<FaLock className="text-gray-400" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    }
                    className={colors.input.focus.ring}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`mt-3 w-full h-12 flex justify-center items-center rounded-xl text-base font-semibold ${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.button.primary.focus} transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg transform hover:-translate-y-0.5`}
                  icon={isLoading ? undefined : <FaUserPlus className="w-4 h-4" />}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Criando conta...</span>
                    </div>
                  ) : "Criar Conta"}
                </Button>
              </form>
            )}

            <div className={`mt-8 pt-6 ${colors.border.primary} border-t`}>
              <p className={`text-center text-sm ${colors.text.secondary}`}>
                Já tem uma conta?{' '}
                <Link 
                  href="/login" 
                  className={`font-semibold ${colors.button.link.text} ${colors.button.link.extra} transition-colors duration-200 hover:underline`}
                >
                  Faça login
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="sm:my-6 text-center">
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