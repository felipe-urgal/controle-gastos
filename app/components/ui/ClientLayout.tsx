// app/components/ClientLayout.tsx
'use client';
  
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
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
  
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const pathname = usePathname();
  const isCalendarPage = pathname === '/calendario';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setFloatingMenuOpen(false);
      }
    };

    if (floatingMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [floatingMenuOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && floatingMenuOpen) {
        setFloatingMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [floatingMenuOpen]);

  const handleLogout = useCallback(() => {
    logout();
    setFloatingMenuOpen(false);
  }, [logout]);

  const toggleTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setFloatingMenuOpen(false);
  }, [setTheme]);

  const openAccountsModal = useCallback(() => {
    setAccountsModalOpen(true);
    setFloatingMenuOpen(false);
  }, []);

  const openCategoriesModal = useCallback(() => {
    setCategoriesModalOpen(true);
    setFloatingMenuOpen(false);
  }, []);

  const toggleFloatingMenu = useCallback(() => {
    setFloatingMenuOpen(prev => !prev);
  }, []);

  const getThemeIcon = () => {
    const iconClass = "transition-colors duration-200";
    switch (theme) {
      case 'light': 
        return <FaSun className={`text-yellow-500 ${iconClass}`} size={16} />;
      case 'dark': 
        return <FaMoon className={`text-blue-400 ${iconClass}`} size={16} />;
      default: 
        return <FaDesktop className={`text-gray-500 ${iconClass}`} size={16} />;
    }
  };

  const MenuSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className={`${themeColors.bg.modal} border ${themeColors.border.primary} overflow-hidden`}>
      <div className={`px-3 py-2 border-b ${themeColors.border.primary}`}>
        <span className={`text-xs font-medium ${themeColors.text.tertiary}`}>{title}</span>
      </div>
      {children}
    </div>
  );

  const MenuButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    showIndicator?: boolean;
    danger?: boolean;
  }> = ({ onClick, icon, label, isActive = false, showIndicator = false, danger = false }) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full px-3 py-3 gap-3 transition-all duration-200 ${
        isActive 
          ? `${themeColors.colors.info.bg} ${themeColors.colors.info.text} border-r-2 ${themeColors.border.accent}` 
          : `${themeColors.state.hover} ${themeColors.text.primary}`
      } ${danger ? themeColors.colors.error.text : ''}`}
      aria-pressed={isActive}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className={`text-sm font-medium ${danger ? themeColors.colors.error.text : ''}`}>
          {label}
        </span>
      </div>
      {showIndicator && (
        <div className={`w-2 h-2 ${themeColors.button.primary.bg.split(' ')[0]} rounded-full`} />
      )}
    </button>
  );

  useEffect(() => {
    if (isCalendarPage && window.innerWidth >= 1024) {
      document.body.classList.add('calendar-page-desktop');
    } else {
      document.body.classList.remove('calendar-page-desktop');
    }
    
    return () => {
      document.body.classList.remove('calendar-page-desktop');
    };
  }, [isCalendarPage]);

  return (
    <div className={`full-viewport ${themeColors.bg.primary} relative main-container`}>
      {children}
      
      {/* Floating Menu */}
      {!isAnyModalOpen && (
        <div className="fixed bottom-5 right-5 z-50 floating-menu-container" ref={menuRef}>
          {/* Menu Options */}
          {floatingMenuOpen && (
            <div 
              className="absolute bottom-18 right-0 w-50 animate-slide-up"
              role="menu"
              aria-label="Menu de opções"
            >
              {/* Theme Section */}
              <MenuSection title="Tema">
                <MenuButton
                  onClick={() => toggleTheme('light')}
                  icon={<FaSun className={theme === 'light' ? 'text-yellow-500' : themeColors.text.tertiary} size={16} />}
                  label="Claro"
                  isActive={theme === 'light'}
                  showIndicator={theme === 'light'}
                />
                <MenuButton
                  onClick={() => toggleTheme('dark')}
                  icon={<FaMoon className={theme === 'dark' ? 'text-blue-400' : themeColors.text.tertiary} size={16} />}
                  label="Escuro"
                  isActive={theme === 'dark'}
                  showIndicator={theme === 'dark'}
                />
                <MenuButton
                  onClick={() => toggleTheme('system')}
                  icon={<FaDesktop className={theme === 'system' ? themeColors.text.primary : themeColors.text.tertiary} size={16} />}
                  label="Sistema"
                  isActive={theme === 'system'}
                  showIndicator={theme === 'system'}
                />
              </MenuSection>

              {user && (
                <MenuSection title="Gerenciar">
                <MenuButton
                  onClick={openAccountsModal}
                  icon={<FaWallet className="text-blue-500" size={16} />}
                  label="Contas"
                />
                <MenuButton
                  onClick={openCategoriesModal}
                  icon={<FaTags className="text-green-500" size={16} />}
                  label="Categorias"
                />
                <button 
                  onClick={toggleShowValues}
                  className={`flex items-center justify-start w-full ${themeColors.bg.modal} gap-3 px-3 py-3 transition-all duration-200 group`}
                  role="menuitem"
                  aria-label={user?.showValues ? 'Ocultar valores' : 'Mostrar valores'}
                > 
                  <div className="transition-transform duration-200">
                    {user?.showValues ? (
                      <FaEyeSlash className={`w-4 h-4 ${themeColors.text.secondary}`} />
                    ) : (
                      <FaEye className={`w-4 h-4 ${themeColors.text.secondary}`} />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${themeColors.text.secondary}`}>
                    {user?.showValues ? 'Ocultar valores' : 'Mostrar valores'}
                  </span>
                </button>

                <MenuButton
                  onClick={handleLogout}
                  icon={<FaSignOutAlt className={themeColors.colors.error.text} size={16} />}
                  label="Sair"
                  danger
                />
                </MenuSection>
              )}
            </div>
          )}

          {/* Floating Action Button */}
          <button
            ref={buttonRef}
            onClick={toggleFloatingMenu}
            className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
              floatingMenuOpen 
                ? 'bg-red-500 hover:bg-red-600 rotate-45 scale-110' 
                : `${themeColors.button.primary.bg.split(' hover:')[0]} hover:${themeColors.button.primary.bg.split(' hover:')[1]}`
            }`}
            aria-expanded={floatingMenuOpen}
            aria-label={floatingMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-haspopup="menu"
          >
            {floatingMenuOpen ? (
              <FaTimes className="text-white text-lg transition-transform duration-300" />
            ) : (
              <div className="transition-transform duration-300 hover:scale-110">
                {getThemeIcon()}
              </div>
            )}
          </button>
        </div>
      )}

      {/* Overlay */}
      {floatingMenuOpen && !isAnyModalOpen && (
        <div 
          className={`fixed inset-0 z-40 ${themeColors.bg.overlay} animate-fade-in`}
          onClick={() => setFloatingMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Modals */}
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
}
