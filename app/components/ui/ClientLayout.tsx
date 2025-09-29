// app/components/ClientLayout.tsx
'use client';

import { useState } from 'react';
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import { useMobileDetection } from '@/app/hook/useMobileDetection';
import { MobileView } from '@/app/components';
import { 
  FaSignOutAlt, 
  FaEllipsisH, 
  FaTimes, 
  FaSun, 
  FaMoon, 
  FaDesktop 
} from 'react-icons/fa';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [floatingMenuOpen, setFloatingMenuOpen] = useState(false);
  const { logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isMobile = useMobileDetection();

  const handleLogout = () => {
    logout();
    setFloatingMenuOpen(false);
  };

  const toggleTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setFloatingMenuOpen(false);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <FaSun className="text-yellow-500" size={14} />;
      case 'dark': return <FaMoon className="text-blue-400" size={14} />;
      default: return <FaDesktop className="text-gray-500" size={14} />;
    }
  };

  // Conteúdo principal
  const content = (
    <div className={`min-h-dvh w-full overflow-hidden ${resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white'}  relative`}>
      {children}
      
      {/* Menu Flutuante Avançado */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Menu de opções com animação */}
        {floatingMenuOpen && (
          <div className="absolute bottom-14 right-0 space-y-1">
            {/* Botão de Tema */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => toggleTheme('light')}
                className={`flex items-center justify-between w-full px-4 py-3 transition-all duration-200 ${
                  theme === 'light' 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-sm">Claro</span>
                <FaSun className="text-yellow-500" size={14} />
              </button>
              
              <button
                onClick={() => toggleTheme('dark')}
                className={`flex items-center justify-between w-full px-4 py-3 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-sm">Escuro</span>
                <FaMoon className="text-blue-400" size={14} />
              </button>
              
              <button
                onClick={() => toggleTheme('system')}
                className={`flex items-center justify-between w-full px-4 py-3 transition-all duration-200 ${
                  theme === 'system' 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-sm">Sistema</span>
                <FaDesktop className="text-gray-500" size={14} />
              </button>
            </div>

            {/* Botão de Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-end w-full bg-white dark:bg-gray-800 rounded-lg shadow-md px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 transform hover:scale-105 animate-slide-up"
              style={{ animationDelay: '0.3s' }}
            >
              <span className="text-sm text-red-600 dark:text-red-400 mr-2">Sair</span>
              <FaSignOutAlt className="text-red-500 dark:text-red-400" size={14} />
            </button>
          </div>
        )}

        {/* Botão principal flutuante */}
        <button
          onClick={() => setFloatingMenuOpen(!floatingMenuOpen)}
          className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
            floatingMenuOpen 
              ? 'bg-red-500 hover:bg-red-600 rotate-45' 
              : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
          }`}
        >
          {floatingMenuOpen ? (
            <FaTimes className="text-white text-lg" />
          ) : (
            getThemeIcon()
          )}
        </button>
      </div>

      {/* Overlay para fechar o menu */}
      {floatingMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 animate-fade-in"
          onClick={() => setFloatingMenuOpen(false)}
        />
      )}
    </div>
  );

  // Adicione estas animações no seu CSS global ou tailwind.config.js
  const style = `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slide-up {
      from { 
        opacity: 0; 
        transform: translateY(10px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }
    .animate-slide-up {
      animation: slide-up 0.3s ease-out forwards;
    }
  `;

  return (
    <>
      <style jsx>{style}</style>
      {isMobile ? <MobileView>{content}</MobileView> : content}
    </>
  );
}
