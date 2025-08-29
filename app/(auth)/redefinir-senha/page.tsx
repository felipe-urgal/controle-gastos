"use client";

// Hooks
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import { Input, Button } from '@/app/components'

// Icons
import { FaLock, FaCheckCircle, FaExclamationCircle, FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';

function RedefinirSenhaContent() {
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const validatePassword = () => {
    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return false;
    }
    
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Senha alterada com sucesso! Redirecionando para login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setMessage(data.error || 'Erro ao redefinir senha. O link pode ter expirado.');
      }
    } catch (error) {
      console.log(error);
      setMessage('Erro na conexão com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const success = message.includes("sucesso");

  if (isAuthenticated) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden w-full max-w-md transform transition-all duration-500 ${isMounted ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}>
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-8 px-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/10 rounded-full">
              <FaLock className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold text-center">Redefinir Senha</h1>
          <p className="text-white/80 text-center mt-2">
            {success ? 'Sua senha foi alterada com sucesso' : 'Digite sua nova senha'}
          </p>
        </div>
        
        <div className="p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start animate-fade-in ${
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

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Nova Senha"
                  name="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="••••••••"
                  loading={isLoading}
                  disabled={isLoading}
                  error={passwordError}
                  icon={<FaLock />}
                />
                <button
                  type="button"
                  className="absolute right-3 top-10 text-gray-500 hover:text-purple-600 transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirmar Nova Senha"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="••••••••"
                  loading={isLoading}
                  disabled={isLoading}
                  error={passwordError}
                  icon={<FaLock />}
                />
                <button
                  type="button"
                  className="absolute right-3 top-10 text-gray-500 hover:text-purple-600 transition-colors duration-200"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg"
                icon={isLoading ? undefined : <FaLock />}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando...
                  </div>
                ) : "Redefinir Senha"}
              </Button>
            </form>
          )}

          <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors duration-200"
            >
              <FaArrowLeft className="mr-2 h-3 w-3" />
              Voltar para o login
            </button>
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

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-white/80">Carregando...</p>
        </div>
      </div>
    }>
      <RedefinirSenhaContent />
    </Suspense>
  );
}