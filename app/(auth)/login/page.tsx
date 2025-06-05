"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (error) {
      console.log(error);
      setError("Email ou senha incorretos");
      setPassword("");
    }
  };

  if (isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  console.log(email)

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-0 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-700 rounded-2xl shadow-xl overflow-hidden w-full max-w-md">
        <div className="bg-gray-600 py-6 px-8">
          <h1 className="text-gray-200 text-2xl font-bold text-center">Bem-vindo de volta</h1>
          <p className="text-gray-400 text-center mt-2">Faça login para acessar sua conta</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="email" 
                className={`
                  block text-sm font-medium mb-2
                  ${email ? 'text-blue-400' : 'text-gray-600' }
                `}
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg 
                    className={`
                      h-5 w-5
                      ${email ? 'text-blue-400' : 'text-gray-600' }
                    `}
                    fill="none" viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`
                    block w-full pl-10 pr-3 py-3 rounded-lg shadow-sm transition duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500
                    placeholder:text-gray-600 border
                    focus:outline-none focus:ring-1 focus:border-transparent focus:ring-blue-500
                    ${email ? 'border-blue-800 border-1 text-gray-400' : 'border-gray-600 text-gray-500' }
                  `}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div>
              <label 
                htmlFor="password" 
                className={`
                  block text-sm font-medium text-gray-400 mb-2
                  ${password ? 'text-blue-400' : 'text-gray-600' }
                `}
              >
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg 
                    className={`
                      h-5 w-5
                      ${password ? 'text-blue-400' : 'text-gray-600' }
                    `}
                    fill="none" viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`
                    block w-full pl-10 pr-3 py-3 rounded-lg shadow-sm transition duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500
                    placeholder:text-gray-600 border
                    focus:outline-none focus:ring-1 focus:border-transparent focus:ring-blue-500
                    ${password ? 'border-blue-800 border-1 text-gray-400' : 'border-gray-600 text-gray-500' }
                  `}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link href="/recuperar-senha" className="font-medium text-gray-500 hover:text-gray-800">
                  Esqueceu a senha?
                </Link>
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
                  Processando...
                </>
              ) : "Entrar"}
            </button>
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