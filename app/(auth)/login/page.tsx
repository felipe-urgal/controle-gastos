'use client';

// importing hooks
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStandalone } from "@/app/hook";

// importing context
import { useAuth } from "@/app/context";

// importing components
import Link from "next/link";
import { Input, Button } from "@/app/components/ui";
import { BackgroundParticles } from "@/app/components/layout";

// importing icons
import { FaEnvelope, FaLock, FaSignInAlt, FaEye, FaEyeSlash, FaArrowLeft, FaShieldAlt, FaChartLine, FaMobileAlt } from "react-icons/fa";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  
  const router = useRouter();
  const { isStandalone } = useStandalone();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/contas");
    }
  }, [isAuthenticated, router]);

  if (isLoading) return null;

  if (isAuthenticated) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError("");

    try {
      await login({
        email: form.email,
        password: form.password,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao fazer login";

      if (errorMessage.includes(",")) {
        const splitted = errorMessage
          .split(",")
          .map(e => e.trim())
          .filter(Boolean);

        const fieldErrors = {
          email: "",
          password: "",
        };

        splitted.forEach(message => {
          if (message.toLowerCase().includes("e-mail")) {
            fieldErrors.email = message;
          }
          if (message.toLowerCase().includes("senha")) {
            fieldErrors.password = message;
          }
        });

        setErrors(fieldErrors);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: FaShieldAlt, text: "Segurança", color: "from-purple-500 to-purple-600" },
    { icon: FaChartLine, text: "Controle", color: "from-indigo-500 to-indigo-600" },
    { icon: FaMobileAlt, text: "Mobile", color: "from-blue-500 to-blue-600" }
  ];

  const backButtonTopClass = isStandalone ? 'top-16' : 'top-6';
  
  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <BackgroundParticles />
      </div>

      <div className={`absolute left-6 z-10 lg:hidden ${backButtonTopClass}`}>
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        >
          <FaArrowLeft size={16} />
          <span className="text-sm">Voltar</span>
        </Link>
      </div>

      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative max-w-md px-10 z-10">
          <div className="w-20 h-20 mb-8 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-2xl flex items-center justify-center shadow-2xl">
            <span className="text-4xl font-bold text-white">$</span>
          </div>

          <h1 className="text-5xl font-bold leading-tight">
            Bem-vindo de volta
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300">
              à sua organização financeira
            </span>
          </h1>

          <p className="mt-6 text-purple-100 text-lg leading-relaxed">
            Acesse sua conta e continue controlando seus gastos com clareza e simplicidade.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="p-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/10">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2`}>
                    <Icon className="text-white" size={18} />
                  </div>
                  <p className="text-xs text-purple-200">{feature.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <p className="text-sm text-purple-200 italic">
              &ldquo;Desde que comecei a usar, minha vida financeira mudou completamente. 
              Finalmente tenho controle total dos meus gastos.&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400" />
              <div>
                <p className="text-sm font-medium">Ana Silva</p>
                <p className="text-xs text-purple-300">Usuária há 6 meses</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center w-full lg:w-[45%] min-h-screen p-4 sm:p-8">  
        <div className="w-full max-w-md">
          <div className="relative p-8 sm:p-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                <FaSignInAlt className="text-white text-2xl" />
              </div>
              
              <h2 className="text-2xl font-semibold tracking-tight">
                Entrar na conta
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Continue de onde parou
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 text-sm rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full" />
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="email"
                label="E-mail"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                icon={<FaEnvelope className="text-slate-400" />}
                disabled={isSubmitting}
                error={errors.email}
                autoComplete="email"
              />

              <Input
                type={showPassword ? "text" : "password"}
                label="Senha"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                icon={<FaLock className="text-slate-400" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                    aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  >
                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                }
                disabled={isSubmitting}
                error={errors.password}
                autoComplete="current-password"
              />

              {/* Opções extras */}
              <div className="flex items-center justify-between">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors relative group"
                >
                  Esqueceu a senha?
                  <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-purple-600 transition-all group-hover:w-full"></span>
                </Link>
              </div>

              {/* Botão de submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="relative w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/25 disabled:opacity-70 disabled:hover:scale-100"
                isLoading={isSubmitting}
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? "Entrando..." : "Entrar"}
                  {!isSubmitting && <FaSignInAlt className="text-sm" />}
                </span>
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Não tem uma conta?{" "}
                <Link
                  href="/signup"
                  className="relative group font-medium text-purple-600 hover:text-purple-700 transition-colors"
                >
                  Criar conta gratuita
                  <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-purple-600 transition-all group-hover:w-full"></span>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
