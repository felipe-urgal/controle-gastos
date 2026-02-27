"use client";

// importing hooks
import { useEffect, useState } from "react";

// importing components
import Link from "next/link";

export default function NotFound() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e: MouseEvent) =>
      setMouse({ x: e.clientX, y: e.clientY });

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center px-6">

      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(600px circle at ${mouse.x}px ${mouse.y}px, rgba(139,92,246,0.15), transparent 40%)`,
        }}
      />

      <div className="absolute top-[-300px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-purple-500/20 blur-[140px] rounded-full -z-10" />

      <div className="text-center max-w-xl">

        <h1 className="text-7xl md:text-9xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent">
          404
        </h1>

        <h2 className="mt-6 text-2xl md:text-3xl font-semibold">
          Página não encontrada
        </h2>

        <p className="mt-6 text-slate-600 dark:text-slate-400">
          A página que você está tentando acessar não existe ou foi removida.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/30 hover:scale-[1.03]"
          >
            Voltar para o início
          </Link>

          <button
            onClick={() => window.history.back()}
            className="px-8 py-4 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Voltar
          </button>
        </div>

      </div>
    </div>
  );
};
