// app/components/ClientLayout.tsx
'use client';

import { useState } from 'react';
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from '@/app/hook/useThemeColors';
import { useUI } from "@/app/context/UIContext";
import { AccountsModal, CategoriesModal } from '@/app/components';
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
} from 'react-icons/fa';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [floatingMenuOpen, setFloatingMenuOpen] = useState(false);
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  
  const { logout, toggleShowValues, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isAnyModalOpen } = useUI();
  const themeColors = useThemeColors();

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
    <div className={`${themeColors.bg.primary}`}>
      {children}
      
      {/* Menu Flutuante Avançado */}
      
      {!isAnyModalOpen && (
        <div className="fixed bottom-13 left-3 z-50">
          {/* Menu de opções com animação */}
          {floatingMenuOpen && (
            <div className="absolute bottom-11 left-0 w-48">
              {/* Seção de Gerenciamento */}
              <div className={`${themeColors.bg.modal} rounded-t-3xl border ${themeColors.border.primary} overflow-hidden`}>
                <div className={`px-3 py-2 border-b ${themeColors.border.primary}`}>
                  <span className={`text-xs font-medium ${themeColors.text.tertiary}`}>Gerenciar</span>
                </div>
                
                {/* Botão Contas */}
                <button
                  onClick={openAccountsModal}
                  className={`flex items-center justify-between w-full px-3 py-3 gap-3 transition-all duration-200 ${themeColors.state.hover} ${themeColors.text.primary} group`}
                >
                  <div className="flex items-center gap-3">
                    <FaWallet className="text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" size={16} />
                    <span className="text-sm font-medium">Contas</span>
                  </div>
                </button>
                
                {/* Botão Categorias */}
                <button
                  onClick={openCategoriesModal}
                  className={`flex items-center justify-between w-full px-3 py-3 gap-3 transition-all duration-200 ${themeColors.state.hover} ${themeColors.text.primary} group`}
                >
                  <div className="flex items-center gap-3">
                    <FaTags className="text-green-500 group-hover:text-green-600 dark:group-hover:text-green-400" size={16} />
                    <span className="text-sm font-medium">Categorias</span>
                  </div>
                </button>
              </div>

              {/* Seção de Tema */}
              <div className={`${themeColors.bg.modal} border ${themeColors.border.primary} overflow-hidden`}>
                <div className={`px-3 py-2 border-b ${themeColors.border.primary}`}>
                  <span className={`text-xs font-medium ${themeColors.text.tertiary}`}>Tema</span>
                </div>
                
                <button
                  onClick={() => toggleTheme('light')}
                  className={`flex items-center justify-between w-full px-3 py-3 gap-3 transition-all duration-200 ${
                    theme === 'light' 
                      ? `${themeColors.colors.info.bg} ${themeColors.colors.info.text} border-r-2 ${themeColors.border.accent}` 
                      : `${themeColors.state.hover} ${themeColors.text.primary}`
                  }`}
                  aria-pressed={theme === 'light'}
                >
                  <div className="flex items-center gap-3">
                    <FaSun className={`${theme === 'light' ? 'text-yellow-500' : themeColors.text.tertiary}`} size={16} />
                    <span className="text-sm font-medium">Claro</span>
                  </div>
                  {theme === 'light' && <div className={`w-2 h-2 ${themeColors.button.primary.bg.split(' ')[0]} rounded-full`} />}
                </button>
                
                <button
                  onClick={() => toggleTheme('dark')}
                  className={`flex items-center justify-between w-full px-3 py-3 gap-3 transition-all duration-200 ${
                    theme === 'dark' 
                      ? `${themeColors.colors.info.bg} ${themeColors.colors.info.text} border-r-2 ${themeColors.border.accent}` 
                      : `${themeColors.state.hover} ${themeColors.text.primary}`
                  }`}
                  aria-pressed={theme === 'dark'}
                >
                  <div className="flex items-center gap-3">
                    <FaMoon className={`${theme === 'dark' ? 'text-blue-400' : themeColors.text.tertiary}`} size={16} />
                    <span className="text-sm font-medium">Escuro</span>
                  </div>
                  {theme === 'dark' && <div className={`w-2 h-2 ${themeColors.button.primary.bg.split(' ')[0]} rounded-full`} />}
                </button>
                
                <button
                  onClick={() => toggleTheme('system')}
                  className={`flex items-center justify-between w-full px-3 py-3 gap-3 transition-all duration-200 ${
                    theme === 'system' 
                      ? `${themeColors.colors.info.bg} ${themeColors.colors.info.text} border-r-2 ${themeColors.border.accent}` 
                      : `${themeColors.state.hover} ${themeColors.text.primary}`
                  }`}
                  aria-pressed={theme === 'system'}
                >
                  <div className="flex items-center gap-3">
                    <FaDesktop className={`${theme === 'system' ? themeColors.text.primary : themeColors.text.tertiary}`} size={16} />
                    <span className="text-sm font-medium">Sistema</span>
                  </div>
                  {theme === 'system' && <div className={`w-2 h-2 ${themeColors.button.primary.bg.split(' ')[0]} rounded-full`} />}
                </button>
              </div>

              {/* Botão de Mostrar/Ocultar Valores */}
              <button 
                onClick={toggleShowValues}
                className={`flex items-center justify-between w-full ${themeColors.bg.modal} px-4 py-3 border ${themeColors.border.primary} transition-all duration-200 transform group`}
                title={user?.showValues ? 'Ocultar valores' : 'Mostrar valores'}
                aria-label={user?.showValues ? 'Ocultar valores' : 'Mostrar valores'}
              > 
                <span className={`text-sm font-medium ${themeColors.text.secondary} group-hover:${themeColors.text.primary} transition-colors`}>
                  {user?.showValues ? 'Ocultar valores' : 'Mostrar valores'}
                </span>
                <div className="transition-transform duration-200 group-hover:scale-110">
                  {user?.showValues ? (
                    <FaEyeSlash className={`w-4 h-4 ${themeColors.text.secondary} group-hover:${themeColors.text.primary} transition-colors`}  />
                  ) : (
                    <FaEye className={`w-4 h-4 ${themeColors.text.secondary} group-hover:${themeColors.text.primary} transition-colors`} />
                  )}
                </div>
              </button>

              {/* Botão de Logout */}
              <button
                onClick={handleLogout}
                className={`flex items-center justify-between w-full ${themeColors.bg.modal} rounded-b-3xl px-4 py-3 border ${themeColors.border.primary} transition-all duration-200 transform group`}
                aria-label="Sair da aplicação"
              >
                <span className={`text-sm font-medium ${themeColors.colors.error.text} group-hover:${themeColors.colors.error.text.replace('300', '400').replace('700', '800')} transition-colors`}>
                  Sair
                </span>
                <FaSignOutAlt className={`${themeColors.colors.error.text} group-hover:scale-110 transition-transform`} size={16} />
              </button>
            </div>
          )}

          {/* Botão principal flutuante */}
          <button
            onClick={() => setFloatingMenuOpen(!floatingMenuOpen)}
            className={`w-10 h-10 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
              floatingMenuOpen 
                ? 'bg-red-500 hover:bg-red-600 rotate-45' 
                : `${themeColors.button.primary.bg.split(' hover:')[0]} hover:${themeColors.button.primary.bg.split(' hover:')[1]}`
            }`}
          >
            {floatingMenuOpen ? (
              <FaTimes className="text-white text-lg" />
            ) : (
              getThemeIcon()
            )}
          </button>
        </div>
      )}

      {/* Overlay para fechar o menu */}
      {floatingMenuOpen && !isAnyModalOpen && (
        <div 
          className={`fixed inset-0 z-40 ${themeColors.bg.overlay} animate-fade-in`}
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
      {content}
    </>
  );
}