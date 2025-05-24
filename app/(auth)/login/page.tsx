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

  if (isAuthenticated || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div
        className="absolute inset-0 bg-[url('/controle.jpg')] bg-cover bg-center bg-no-repeat"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 bg-white p-8 shadow-lg rounded-xl w-full max-w-md">
        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-700">Login</h1>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex  cursor-pointer">
              <Link href="/recuperar-senha" className="cursor-pointer text-sm text-blue-600 hover:text-blue-500 mb-1">
                Esqueceu a senha?
              </Link>
            </div>
            {/*<div className="flex flex-col items-end">
              <Link href="/alterar-senha" className="cursor-pointer text-sm text-blue-600 hover:text-blue-500 mb-1">
                Alterar senha
              </Link>
            </div>*/}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-md transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Carregando..." : "Entrar"}
          </button>

          <div className="text-center mt-4">
            <span className="text-sm text-gray-600">Não tem uma conta? </span>
            <Link 
              href="/criar-conta" 
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Criar conta
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}