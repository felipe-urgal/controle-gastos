"use client";

import { useState } from "react";
import { useAuth } from "@/app/context";
import { useThemeColors } from "@/app/hook";
import Link from "next/link";
import { Input, Button } from '@/app/components';
import { FaLock, FaKey, FaCheckCircle, FaExclamationTriangle, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    } else if (form.novaSenha.length > 100) {
      newErrors.novaSenha = 'Senha não pode exceder 100 caracteres';
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
      setMensagem("Token inválido ou expirado. Solicite um novo link de recuperação.");
      return;
    }

    setErrors({ novaSenha: "", confirmarSenha: "" });
    setMensagem("");
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, form.novaSenha);
      
      if (result.success) {
        setMensagem(result.message || "Senha redefinida com sucesso!");
        setForm({ novaSenha: "", confirmarSenha: "" });
      } else {
        setMensagem(result.message || "Erro ao redefinir senha.");
      }
    } catch (error) {
      console.error("Erro na redefinição:", error);
      setMensagem("Erro inesperado ao redefinir senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (mensagem) setMensagem("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const success = mensagem.includes("sucesso") || 
                  mensagem.includes("redefinida") || 
                  mensagem.includes("Senha redefinida");

  // if (!token) {
  //   return (
  //     <div className={`fixed inset-0 ${colors.bg.secondary} flex items-center sm:items-center justify-center z-50 p-0 animate-fade-in safe-area-container`}>
  //       <div 
  //         className={`
  //           ${colors.bg.modal} w-full h-full sm:max-w-[50vh] sm:max-h-[70vh] sm:mx-4 overflow-hidden flex flex-col 
  //           animate-slide-up-mobile sm:animate-slide-up justify-between
  //           modal-fullscreen-mobile calendar-mobile-fullscreen sm:rounded-3xl
  //         `}
  //       > 
  //         <div className={`${colors.bg.primary} overflow-hidden ${colors.border.primary} text-center p-8`}>
  //           <div className="mb-6 flex justify-center">
  //             <div className="p-3 bg-red-100 rounded-full">
  //               <FaExclamationTriangle className="h-12 w-12 text-red-500" />
  //             </div>
  //           </div>
  //           <h2 className={`text-xl font-bold ${colors.text.primary} mb-4`}>
  //             Link Inválido ou Expirado
  //           </h2>
  //           <p className={`${colors.text.secondary} mb-6`}>
  //             Este link de redefinição de senha é inválido ou expirou. 
  //             Solicite um novo link na página de recuperação de senha.
  //           </p>
  //           <Link 
  //             href="/recuperar-senha" 
  //             className={`inline-flex items-center justify-center w-full h-12 rounded-xl text-base font-semibold ${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.button.primary.focus} transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5`}
  //           >
  //             <FaArrowLeft className="mr-2 w-4 h-4" />
  //             Solicitar Novo Link
  //           </Link>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className={`fixed inset-0 ${colors.bg.secondary} flex items-center sm:items-center justify-center z-50 p-0 animate-fade-in safe-area-container`}>
      <div 
        className={`
          ${colors.bg.modal} w-full h-full sm:max-w-[50vh] sm:max-h-[70vh] sm:mx-4 overflow-hidden flex flex-col 
          animate-slide-up-mobile sm:animate-slide-up justify-between
          modal-fullscreen-mobile calendar-mobile-fullscreen sm:rounded-3xl
        `}
      > 
        <div className={`${colors.bg.primary} overflow-hidden ${colors.border.primary}`}>
          
          <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 py-6 px-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <FaKey className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">
              {success ? "Senha Redefinida!" : "Redefinir Senha"}
            </h1>
            <p className="text-white/90 text-sm">
              {success 
                ? "Sua senha foi alterada com sucesso" 
                : "Digite sua nova senha"}
            </p>
          </div>
          
          <div className="px-6 py-8">
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
                <div className="flex-1">
                  <p className={`text-sm font-medium ${success ? 'text-green-800' : 'text-red-800'}`}>
                    {success ? 'Sucesso!' : 'Erro'}
                  </p>
                  <p className={`text-sm mt-1 ${success ? 'text-green-700' : 'text-red-700'}`}>
                    {mensagem}
                  </p>
                </div>
              </div>
            )}

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                
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
                        disabled={loading}
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
                        disabled={loading}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    }
                    className={colors.input.focus.ring}
                  />
                </div>

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
            ) : (
              <div className="text-center py-2 animate-fade-in">
                <div className="mb-6 flex justify-center">
                  <div className={`p-3 ${colors.colors.success.bg} rounded-full`}>
                    <FaCheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                </div>
                <p className={`${colors.text.secondary} mb-6 text-sm leading-relaxed`}>
                  Sua senha foi redefinida com sucesso! Você já pode fazer login com sua nova senha.
                </p>
                
                <Link 
                  href="/login" 
                  className={`inline-flex items-center justify-center w-full h-12 rounded-xl text-base font-semibold ${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.button.primary.focus} transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5`}
                >
                  <FaArrowLeft className="mr-2 w-4 h-4" />
                  Fazer Login
                </Link>
              </div>
            )}

            {!success && (
              <div className={`mt-8 pt-6 ${colors.border.primary} border-t text-center`}>
                <Link 
                  href="/login" 
                  className={`inline-flex items-center text-sm font-medium ${colors.button.link.text} ${colors.button.link.extra} transition-colors duration-200 hover:underline`}
                >
                  <FaArrowLeft className="mr-2 h-3 w-3" />
                  Voltar para o login
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="sm:my-6  text-center">
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