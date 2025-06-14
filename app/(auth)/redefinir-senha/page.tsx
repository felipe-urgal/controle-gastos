"use client";

// Hooks
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import { Input } from '@/app/components/ui/Input'
import { Button } from '@/app/components/ui/Button'

// Icons
import { FaLock, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

function RedefinirSenhaContent() {
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setMessage(data.error || 'Erro ao redefinir senha');
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-0 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-700 rounded-2xl shadow-xl overflow-hidden w-full max-w-md p-8">
        <h1 className="text-gray-200 text-2xl font-bold text-center">Redefinir Senha</h1>
        
        {message && (
          <div className={`mt-3 mb-6 p-4 rounded-lg text-sm flex items-start ${
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type='password'
                label="Nova Senha"
                name="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                loading={isLoading}
                disabled={isLoading}
                icon={<FaLock />}
              />
            </div>

            <Button
              variant="default"
              type="submit"
              disabled={isLoading}
              className={`w-full text-white font-semibold p-3 rounded-md transition duration-300 ${
                isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              icon={<FaLock />}
            >
              {isLoading ? "Processando..." : "Redefinir Senha" }
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <RedefinirSenhaContent />
    </Suspense>
  );
}