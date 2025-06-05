"use client";

import { useRouter } from 'next/navigation';
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Verifica se a resposta é JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Resposta inesperada: ${text.slice(0, 100)}...`);
      }

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Email enviado com sucesso!");
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setMessage(data.error || "Erro ao processar");
      }
    } catch (error) {
      setMessage("Erro ao tentar recuperar senha. Verifique o console.");
      console.error("Erro completo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const success = message.includes("sucesso") || message.includes("enviado");

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
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              <svg 
                className={`flex-shrink-0 h-5 w-5 mr-3 ${
                  success ? "text-green-500" : "text-red-500"
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {success ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <span>{message}</span>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                  Email cadastrado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="placeholder:text-gray-900 block w-full pl-10 pr-3 py-3 border border-gray-800 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition duration-200"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 hover:border-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : "Enviar Link de Recuperação"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              Lembrou sua senha?{' '}
              <Link href="/login" className="font-medium text-gray-500 hover:text-gray-800">
                Voltar para o login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}