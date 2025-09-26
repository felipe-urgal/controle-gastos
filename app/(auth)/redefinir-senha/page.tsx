"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      setMensagem("Token inválido");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem("As senhas não coincidem");
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, novaSenha);
    setMensagem(result.message);
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-md"
      >
        <h1 className="mb-4 text-xl font-semibold text-center">
          Redefinir Senha
        </h1>

        <input
          type="password"
          placeholder="Nova senha"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="w-full p-2 mb-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="password"
          placeholder="Confirmar senha"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          className="w-full p-2 mb-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 mt-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Redefinindo..." : "Redefinir Senha"}
        </button>

        {mensagem && (
          <p className="mt-3 text-sm text-center text-red-600">{mensagem}</p>
        )}
      </form>
    </div>
  );
}
