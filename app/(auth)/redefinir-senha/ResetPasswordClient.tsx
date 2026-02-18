"use client";

import { useState } from "react";
import Link from "next/link";
import { Input, Button } from "@/app/components";
import {
  FaLock,
  FaKey,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

export default function ResetPasswordClient({
  token,
}: {
  token?: string;
}) {
  const [form, setForm] = useState({
    novaSenha: "",
    confirmarSenha: "",
  });

  const [errors, setErrors] = useState({
    novaSenha: "",
    confirmarSenha: "",
  });

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    const newErrors = { novaSenha: "", confirmarSenha: "" };

    if (!form.novaSenha) {
      newErrors.novaSenha = "Nova senha é obrigatória";
    } else if (form.novaSenha.length < 6) {
      newErrors.novaSenha = "Mínimo 6 caracteres";
    }

    if (!form.confirmarSenha) {
      newErrors.confirmarSenha = "Confirme sua senha";
    }

    if (
      form.novaSenha &&
      form.confirmarSenha &&
      form.novaSenha !== form.confirmarSenha
    ) {
      newErrors.confirmarSenha = "As senhas não coincidem";
    }

    setErrors(newErrors);

    return !newErrors.novaSenha && !newErrors.confirmarSenha;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setStatus("error");
      setMessage(
        "Token inválido ou expirado. Solicite um novo link de recuperação."
      );
      return;
    }

    if (!validateForm()) return;

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.novaSenha }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("Senha redefinida com sucesso!");
        setForm({ novaSenha: "", confirmarSenha: "" });
      } else {
        setStatus("error");
        setMessage(data.message || "Erro ao redefinir senha.");
      }
    } catch {
      setStatus("error");
      setMessage("Erro inesperado. Tente novamente.");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/40 to-indigo-950/30 px-6">
        <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
          <FaExclamationTriangle className="mx-auto text-red-500 text-4xl mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Link inválido ou expirado
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Solicite um novo link de recuperação.
          </p>
          <Link
            href="/recuperar-senha"
            className="inline-flex items-center justify-center w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:scale-[1.02] transition"
          >
            <FaArrowLeft className="mr-2" />
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  const isLoading = status === "loading";
  const isSuccess = status === "success";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/40 to-indigo-950/30 px-6">
      <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md p-8 transition-all duration-300">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isSuccess ? "Senha redefinida!" : "Redefinir senha"}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {isSuccess
              ? "Agora você já pode acessar sua conta"
              : "Digite sua nova senha"}
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm flex items-start gap-3 ${
              isSuccess
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isSuccess ? <FaCheckCircle /> : <FaExclamationTriangle />}
            <span>{message}</span>
          </div>
        )}

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type={showPassword ? "text" : "password"}
              label="Nova senha"
              name="novaSenha"
              value={form.novaSenha}
              onChange={(e) =>
                setForm({ ...form, novaSenha: e.target.value })
              }
              error={errors.novaSenha}
              icon={<FaLock />}
              disabled={isLoading}
            />

            <Input
              type={showConfirmPassword ? "text" : "password"}
              label="Confirmar senha"
              name="confirmarSenha"
              value={form.confirmarSenha}
              onChange={(e) =>
                setForm({ ...form, confirmarSenha: e.target.value })
              }
              error={errors.confirmarSenha}
              icon={<FaLock />}
              disabled={isLoading}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold transition"
              icon={!isLoading && <FaKey />}
            >
              {isLoading ? "Redefinindo..." : "Redefinir senha"}
            </Button>
          </form>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold transition"
          >
            <FaArrowLeft className="mr-2" />
            Fazer login
          </Link>
        )}
      </div>
    </div>
  );
}