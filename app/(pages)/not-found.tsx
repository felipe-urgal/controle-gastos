"use client";

// importing components
import Link from "next/link";
import { BackgroundParticles } from '@/app/components/layout';

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/40 to-indigo-950/30">

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <BackgroundParticles />
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-purple-500/20 blur-[60px] rounded-full -z-10" />

      <div className="text-center max-w-xl">

        <h1 className="text-7xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent">
          404
        </h1>

        <h2 className="text-2xl font-semibold">
          Página não encontrada
        </h2>

        <p className="text-slate-300/50">
          A página que você está tentando acessar não existe ou foi removida.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg"
          >
            Voltar para o início
          </Link>
        </div>

      </div>
    </div>
  );
};
