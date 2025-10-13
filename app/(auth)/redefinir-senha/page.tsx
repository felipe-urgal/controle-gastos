"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useThemeColors } from "@/app/hook/useThemeColors";
import Link from "next/link";
import { Input, Button } from '@/app/components';
import { FaLock, FaKey, FaCheckCircle, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const colors = useThemeColors();
  
  const [form, setForm] = useState({ 
    novaSenha: "", 
    confirmarSenha: "" 
  });
  const [errors, setErrors] = useState({ 
    novaSenha: "", 
    confirmarSenha: "" 
  });
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      : null;

  const validateForm = () => {
    let valid = true;
    const newErrors = { 
      novaSenha: "", 
      confirmarSenha: "" 
    };

    if (!form.novaSenha.trim()) {
      newErrors.novaSenha = 'Nova senha é obrigatória';
      valid = false;
    } else if (form.novaSenha.length < 6) {
      newErrors.novaSenha = 'Senha deve ter pelo menos 6 caracteres';
      valid = false;
    }

    if (!form.confirmarSenha.trim()) {
      newErrors.confirmarSenha = 'Confirmar senha é obrigatória';
      valid = false;
    }

    if (form.novaSenha !== form.confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem';
      newErrors.novaSenha = 'As senhas não coincidem';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      setMensagem("Token inválido ou expirado");
      return;
    }

    setErrors({ novaSenha: "", confirmarSenha: "" });
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, form.novaSenha);
      setMensagem(result.message);
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (mensagem) setMensagem("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const success = mensagem.includes("sucesso") || mensagem.includes("alterada");

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${colors.bg.secondary}`}>
      <div className={`w-full max-w-md transform transition-all duration-500 ${isMounted ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}>
        
        {/* Card Principal */}
        <div className={`${colors.bg.primary} rounded-2xl shadow-xl overflow-hidden ${colors.border.primary} border`}>
          
          {/* Header com Gradiente */}
          <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 py-6 px-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <FaKey className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Redefinir Senha</h1>
            <p className="text-white/90 text-sm">
              {success 
                ? "Senha redefinida com sucesso!" 
                : "Digite sua nova senha"}
            </p>
          </div>
          
          {/* Conteúdo */}
          <div className="px-6 py-8">
            {!token && (
              <div className={`mb-6 p-4 ${colors.colors.error.bg} ${colors.colors.error.text} rounded-lg ${colors.colors.error.border} border flex items-start animate-fade-in`}>
                <FaExclamationTriangle className="flex-shrink-0 h-5 w-5 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium">Token inválido ou expirado</p>
                  <p className="text-sm mt-1">Solicite um novo link de recuperação de senha.</p>
                </div>
              </div>
            )}

            {mensagem && (
              <div className={`mb-6 p-4 rounded-lg flex items-start animate-fade-in ${
                success 
                  ? `${colors.colors.success.bg} ${colors.colors.success.text} ${colors.colors.success.border} border`
                  : `${colors.colors.error.bg} ${colors.colors.error.text} ${colors.colors.error.border} border`
              }`}>
                <div className="mr-3 mt-0.5">
                  {success ? (
                    <FaCheckCircle className="text-green-500 w-5 h-5 flex-shrink-0" />
                  ) : (
                    <FaExclamationTriangle className="text-red-500 w-5 h-5 flex-shrink-0" />
                  )}
                </div>
                <span className="text-sm">{mensagem}</span>
              </div>
            )}

            {token && !success && (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Campo Nova Senha */}
                <div className="space-y-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    label="Nova Senha"
                    name="novaSenha"
                    value={form.novaSenha}
                    onChange={handleChange}
                    placeholder="••••••••"
                    loading={loading}
                    disabled={loading}
                    error={errors.novaSenha}
                    icon={<FaLock className="text-gray-400" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        {showPassword ? <FaExclamationTriangle /> : <FaLock />}
                      </button>
                    }
                    className={colors.input.focus.ring}
                  />
                </div>

                {/* Campo Confirmar Senha */}
                <div className="space-y-2">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    label="Confirmar Senha"
                    name="confirmarSenha"
                    value={form.confirmarSenha}
                    onChange={handleChange}
                    placeholder="••••••••"
                    loading={loading}
                    disabled={loading}
                    error={errors.confirmarSenha}
                    icon={<FaLock className="text-gray-400" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        {showConfirmPassword ? <FaExclamationTriangle /> : <FaLock />}
                      </button>
                    }
                    className={colors.input.focus.ring}
                  />
                </div>

                {/* Botão Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-12 flex justify-center items-center rounded-xl text-base font-semibold ${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.button.primary.focus} transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg transform hover:-translate-y-0.5`}
                  icon={loading ? undefined : <FaKey className="w-4 h-4" />}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Redefinindo...</span>
                    </div>
                  ) : "Redefinir Senha"}
                </Button>
              </form>
            )}

            {success && (
              <div className="text-center py-2 animate-fade-in">
                <div className="mb-6 flex justify-center">
                  <div className={`p-3 ${colors.colors.success.bg} rounded-full`}>
                    <FaCheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                </div>
                <p className={`${colors.text.secondary} mb-6`}>
                  Sua senha foi redefinida com sucesso! Você já pode fazer login com sua nova senha.
                </p>
                
                <Link 
                  href="/login" 
                  className={`inline-flex items-center justify-center w-full h-12 rounded-xl text-base font-semibold ${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.button.primary.focus} transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5`}
                >
                  <FaArrowLeft className="mr-2 w-4 h-4" />
                  Voltar para o Login
                </Link>
              </div>
            )}

            {/* Link Voltar para Login */}
            {!success && (
              <div className={`mt-8 pt-6 ${colors.border.primary} border-t text-center`}>
                <Link 
                  href="/login" 
                  className={`inline-flex items-center text-sm font-medium ${colors.button.link.text} ${colors.button.link.extra} transition-colors duration-200`}
                >
                  <FaArrowLeft className="mr-2 h-3 w-3" />
                  Voltar para o login
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
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