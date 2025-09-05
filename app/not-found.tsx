"use client"

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200 relative overflow-hidden">
      {/* Efeito de partículas interativo */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.15), transparent 40%)`
        }}
      />
      
      {/* Efeito de grid sutil */}
      <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+PHBhdGggZD0iTTAgMGg1MHY1MEgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iMC4xIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')]" />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-dvh px-4 py-12">
        <div className="text-center max-w-2xl mx-auto">
          {/* Número 404 com efeito */}
          <div className="relative mb-8">
            <h1 className="text-[clamp(6rem,20vw,12rem)] font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 leading-none drop-shadow-2xl">
              404
            </h1>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text opacity-75 blur-xl">
              404
            </div>
          </div>

          {/* Mensagem principal */}
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-slate-100">
            Oops! Página não encontrada
          </h2>

          {/* Descrição */}
          <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed max-w-md mx-auto">
            A página que você está procurando não existe, foi removida ou o endereço pode estar incorreto.
          </p>

          {/* Botão de ação */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/"
              className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
            >
              <span className="relative z-10">Voltar para o Início</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
            </Link>

            <button 
              onClick={() => window.history.back()}
              className="group inline-flex items-center justify-center px-6 py-3.5 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-slate-100 font-medium rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
            >
              <span className="mr-2">←</span>
              Voltar
            </button>
          </div>

          {/* Decoração adicional */}
          <div className="mt-16 flex justify-center space-x-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Efeito de brilho no canto */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-10 animate-pulse-slow" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-10 animate-pulse-slow" />
    </div>
  );
}