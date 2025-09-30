// app/components/ClientLayout.tsx
'use client';

import { useState } from 'react';
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import { useMobileDetection } from '@/app/hook/useMobileDetection';
import { MobileView } from '@/app/components';
import { 
  FaSignOutAlt, 
  FaTimes, 
  FaSun, 
  FaMoon, 
  FaDesktop,
  FaEyeSlash,
  FaEye,
  FaWallet,
  FaTags,
  FaPlus
} from 'react-icons/fa';

// Componentes de Modal (você precisará implementar esses componentes)
import AccountsModal from './AccountsModal';
import CategoriesModal from './CategoriesModal';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [floatingMenuOpen, setFloatingMenuOpen] = useState(false);
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  
  const { logout, toggleShowValues, user } = useAuth();
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

  const openAccountsModal = () => {
    setAccountsModalOpen(true);
    setFloatingMenuOpen(false);
  };

  const openCategoriesModal = () => {
    setCategoriesModalOpen(true);
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
    <div className={`min-h-dvh w-full overflow-hidden ${resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white'} relative`}>
      {children}
      
      {/* Menu Flutuante Avançado */}
      <div className="fixed bottom-3 left-3 z-50">
        {/* Menu de opções com animação */}
        {floatingMenuOpen && (
          <div className="absolute bottom-12 left-0 space-y-2 w-48">
            {/* Seção de Gerenciamento */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Gerenciar</span>
              </div>
              
              {/* Botão Contas */}
              <button
                onClick={openAccountsModal}
                className="flex items-center justify-between w-full px-3 py-3 gap-3 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 group"
              >
                <div className="flex items-center gap-3">
                  <FaWallet className="text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" size={16} />
                  <span className="text-sm font-medium">Contas</span>
                </div>
                <FaPlus className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" size={12} />
              </button>
              
              {/* Botão Categorias */}
              <button
                onClick={openCategoriesModal}
                className="flex items-center justify-between w-full px-3 py-3 gap-3 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 group"
              >
                <div className="flex items-center gap-3">
                  <FaTags className="text-green-500 group-hover:text-green-600 dark:group-hover:text-green-400" size={16} />
                  <span className="text-sm font-medium">Categorias</span>
                </div>
                <FaPlus className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" size={12} />
              </button>
            </div>

            {/* Seção de Tema */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tema</span>
              </div>
              
              <button
                onClick={() => toggleTheme('light')}
                className={`flex items-center justify-between w-full px-3 py-3 gap-3 transition-all duration-200 ${
                  theme === 'light' 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-2 border-blue-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                }`}
                aria-pressed={theme === 'light'}
              >
                <div className="flex items-center gap-3">
                  <FaSun className={`${theme === 'light' ? 'text-yellow-500' : 'text-gray-400'}`} size={16} />
                  <span className="text-sm font-medium">Claro</span>
                </div>
                {theme === 'light' && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
              </button>
              
              <button
                onClick={() => toggleTheme('dark')}
                className={`flex items-center justify-between w-full px-3 py-3 gap-3 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-2 border-blue-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                }`}
                aria-pressed={theme === 'dark'}
              >
                <div className="flex items-center gap-3">
                  <FaMoon className={`${theme === 'dark' ? 'text-blue-400' : 'text-gray-400'}`} size={16} />
                  <span className="text-sm font-medium">Escuro</span>
                </div>
                {theme === 'dark' && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
              </button>
              
              <button
                onClick={() => toggleTheme('system')}
                className={`flex items-center justify-between w-full px-3 py-3 gap-3 transition-all duration-200 ${
                  theme === 'system' 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-2 border-blue-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                }`}
                aria-pressed={theme === 'system'}
              >
                <div className="flex items-center gap-3">
                  <FaDesktop className={`${theme === 'system' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`} size={16} />
                  <span className="text-sm font-medium">Sistema</span>
                </div>
                {theme === 'system' && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
              </button>
            </div>

            {/* Botão de Mostrar/Ocultar Valores */}
            <button 
              onClick={toggleShowValues}
              className="flex items-center justify-between w-full bg-white dark:bg-gray-800 rounded-xl shadow-md px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-100 dark:border-gray-700 transition-all duration-200 transform hover:scale-[1.02] group"
              title={user?.showValues ? 'Ocultar valores' : 'Mostrar valores'}
              aria-label={user?.showValues ? 'Ocultar valores' : 'Mostrar valores'}
            > 
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                {user?.showValues ? 'Ocultar valores' : 'Mostrar valores'}
              </span>
              <div className="transition-transform duration-200 group-hover:scale-110">
                {user?.showValues ? (
                  <FaEyeSlash className="w-4 h-4 text-white/90" />
                ) : (
                  <FaEye className="w-4 h-4 text-white/90" />
                )}
              </div>
            </button>

            {/* Botão de Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-between w-full bg-white dark:bg-gray-800 rounded-xl shadow-md px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-100 dark:border-gray-700 transition-all duration-200 transform hover:scale-[1.02] group"
              aria-label="Sair da aplicação"
            >
              <span className="text-sm font-medium text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
                Sair
              </span>
              <FaSignOutAlt className="text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform" size={16} />
            </button>
          </div>
        )}

        {/* Botão principal flutuante */}
        <button
          onClick={() => setFloatingMenuOpen(!floatingMenuOpen)}
          className={`w-10 h-10 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
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
          className="fixed inset-0 z-40 bg-black/80 dark:bg-black/80 animate-fade-in"
          onClick={() => setFloatingMenuOpen(false)}
        />
      )}

      {/* Modais */}
      <AccountsModal 
        isOpen={accountsModalOpen}
        onClose={() => setAccountsModalOpen(false)}
      />
      
      <CategoriesModal 
        isOpen={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
      />
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