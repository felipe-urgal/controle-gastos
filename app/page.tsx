"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useThemeColors } from "@/app/hook/useThemeColors";
import { Loading } from "@/app/components";
import Link from "next/link";
import { FaSignInAlt, FaUserPlus, FaChartLine, FaShieldAlt, FaMobileAlt } from "react-icons/fa";

export default function Home() {
  const { isAuthenticated, isLoading, authChecked } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  useEffect(() => {
    // Redireciona apenas se a verificação de auth foi concluída
    if (authChecked && isAuthenticated) {
      router.push("/calendario");
    }
  }, [isAuthenticated, authChecked, router]);

  // Mostra loading enquanto verifica autenticação
  if (isLoading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // Se não está autenticado, mostra a página de boas-vindas
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${colors.bg.primary}`}>
        {/* Header */}
        <header className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Controle seus <span className="text-yellow-300">Gastos</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-purple-100">
                Organize suas finanças de forma simples e eficiente
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link 
                  href="/login" 
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-purple-700 font-semibold rounded-xl hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <FaSignInAlt className="mr-3" />
                  Fazer Login
                </Link>
                <Link 
                  href="/criar-conta" 
                  className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-purple-700 transition-all duration-300 transform hover:scale-105"
                >
                  <FaUserPlus className="mr-3" />
                  Criar Conta
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Features Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Por que usar nosso <span className="text-purple-600">Controle de Gastos</span>?
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Feature 1 */}
              <div className={`text-center p-6 rounded-2xl ${colors.bg.secondary} border ${colors.border.primary}`}>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 text-purple-600 rounded-full mb-4">
                  <FaChartLine className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Controle Total</h3>
                <p className={`${colors.text.secondary}`}>
                  Acompanhe todas as suas receitas e despesas em um só lugar com relatórios detalhados.
                </p>
              </div>

              {/* Feature 2 */}
              <div className={`text-center p-6 rounded-2xl ${colors.bg.secondary} border ${colors.border.primary}`}>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4">
                  <FaShieldAlt className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Segurança</h3>
                <p className={`${colors.text.secondary}`}>
                  Seus dados financeiros protegidos com criptografia de ponta a ponta.
                </p>
              </div>

              {/* Feature 3 */}
              <div className={`text-center p-6 rounded-2xl ${colors.bg.secondary} border ${colors.border.primary}`}>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                  <FaMobileAlt className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Acesso em Qualquer Lugar</h3>
                <p className={`${colors.text.secondary}`}>
                  Use no celular, tablet ou computador. Suas informações sempre sincronizadas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Comece a organizar suas finanças hoje mesmo!
            </h2>
            <p className="text-xl mb-8 text-purple-100 max-w-2xl mx-auto">
              Junte-se a milhares de pessoas que já transformaram sua relação com o dinheiro.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/criar-conta" 
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-purple-700 font-semibold rounded-xl hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaUserPlus className="mr-3" />
                Criar Minha Conta Grátis
              </Link>
              <Link 
                href="/login" 
                className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-purple-700 transition-all duration-300 transform hover:scale-105"
              >
                <FaSignInAlt className="mr-3" />
                Já Tenho Conta
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={`py-8 ${colors.bg.secondary} border-t ${colors.border.primary}`}>
          <div className="container mx-auto px-4 text-center">
            <p className={`${colors.text.tertiary}`}>
              © {new Date().getFullYear()} Controle de Gastos. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Fallback - não deve chegar aqui, mas por segurança
  return null;
}