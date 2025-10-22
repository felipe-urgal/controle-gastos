// app/components/ClientLayout.tsx
'use client';

import { usePathname } from 'next/navigation';

import { useState, useRef, useEffect, useCallback } from 'react';

import { useAuth, useTheme, useUI } from '@/app/context';

import { useThemeColors } from '@/app/hook';

import { AccountsModal, CategoriesModal, GoalsModal, ImportModal } from '@/app/components';

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
  FaBullseye,
  FaFileImport,
} from 'react-icons/fa';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [floatingMenuOpen, setFloatingMenuOpen] = useState(false);
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [moved, setMoved] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const { logout, toggleShowValues, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isAnyModalOpen, setModalOpen } = useUI();
  const themeColors = useThemeColors();

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const pathname = usePathname();
  const isCalendarPage = pathname === '/calendario';
  const isGoalPage = pathname === '/metas';

  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Inicializa a posição do menu
  useEffect(() => {
    const updatePosition = () => {
      setMenuPosition({
        x: window.innerWidth - 80,
        y: window.innerHeight - 100,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  // Calcula a posição do menu baseado na posição do botão
  useEffect(() => {
    const calculateMenuStyle = () => {
      const middleY = window.innerHeight / 2;
      const middleX = window.innerWidth / 2;

      const openUp = menuPosition.y > middleY;   // abaixo do meio → abre pra cima
      const openLeft = menuPosition.x > middleX; // à direita do meio → abre pra esquerda

      const menuWidth = 200;
      const menuHeight = 400; // Altura aproximada do menu

      let top = openUp ? -menuHeight : 60;
      const left = openLeft ? -menuWidth + 48 : 0; // 48 = width do botão (12 * 4)
      const right = openLeft ? 0 : undefined;

      // Ajusta para não sair da tela
      if (openUp && menuPosition.y - menuHeight < 0) {
        top = 60; // Força abrir para baixo se não couber acima
      }
      if (!openUp && menuPosition.y + menuHeight > window.innerHeight) {
        top = -menuHeight; // Força abrir para cima se não couber abaixo
      }

      return {
        position: 'absolute' as const,
        width: `${menuWidth}px`,
        top: `${top}px`,
        left: left !== undefined ? `${left}px` : undefined,
        right: right !== undefined ? `${right}px` : undefined,
        maxHeight: `${Math.min(menuHeight, window.innerHeight - 20)}px`,
        overflowY: 'auto' as const,
      };
    };

    if (typeof window !== 'undefined') {
      setMenuStyle(calculateMenuStyle());
    }
  }, [menuPosition]);

  // Fecha o menu ao clicar fora
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
    if (floatingMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [floatingMenuOpen]);

  // Fecha com ESC
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFloatingMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setFloatingMenuOpen(false);
  }, [logout]);

  const toggleTheme = useCallback(
    (newTheme: 'light' | 'dark' | 'system') => {
      setTheme(newTheme);
      setFloatingMenuOpen(false);
    },
    [setTheme]
  );

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

  const openGoalsModal = useCallback(() => {
    setGoalsModalOpen(true);
    setFloatingMenuOpen(false);
  }, []);

  const openImportModal = useCallback(() => {
    setImportModalOpen(true);
    setFloatingMenuOpen(false);
  }, []);

  // Controle de arraste refinado (desktop + mobile)
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!dragStart) return;
      const dx = clientX - dragStart.x;
      const dy = clientY - dragStart.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) setMoved(true);

      setMenuPosition(prev => ({
        x: Math.max(0, Math.min(window.innerWidth - 60, prev.x + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 60, prev.y + dy)),
      }));

      setDragStart({ x: clientX, y: clientY });
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      handleMove(t.clientX, t.clientY);
    };

    const handleEnd = () => {
      setDragStart(null);
      setTimeout(() => setMoved(false), 100);
    };

    if (dragStart) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [dragStart]);

  // Ícone do tema
  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <FaSun className="text-yellow-500" size={16} />;
      case 'dark':
        return <FaMoon className="text-blue-400" size={16} />;
      default:
        return <FaDesktop className="text-gray-500" size={16} />;
    }
  };

  // Componentes auxiliares do menu
  const MenuSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className={`${themeColors.bg.modal} border ${themeColors.border.primary}`}>
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
    if (isCalendarPage && window.innerWidth >= 993)
      document.body.classList.add('calendar-page-desktop');
    else document.body.classList.remove('calendar-page-desktop');
    return () => document.body.classList.remove('calendar-page-desktop');
  }, [isCalendarPage]);

  useEffect(() => {
    setModalOpen(false)
  }, [isGoalPage, setModalOpen]);

  return (
    <div className={`full-viewport ${themeColors.bg.primary} relative main-container`}>
      {children}

      {!isAnyModalOpen && (
        <div
          className="fixed z-52"
          ref={menuRef}
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          {floatingMenuOpen && (
            <div style={menuStyle} className="animate-slide-up" role="menu">
              <MenuSection title="Tema">
                <MenuButton
                  onClick={() => toggleTheme('light')}
                  icon={<FaSun className="text-yellow-500" size={16} />}
                  label="Claro"
                  isActive={theme === 'light'}
                  showIndicator={theme === 'light'}
                />
                <MenuButton
                  onClick={() => toggleTheme('dark')}
                  icon={<FaMoon className="text-blue-400" size={16} />}
                  label="Escuro"
                  isActive={theme === 'dark'}
                  showIndicator={theme === 'dark'}
                />
                <MenuButton
                  onClick={() => toggleTheme('system')}
                  icon={<FaDesktop className="text-gray-500" size={16} />}
                  label="Sistema"
                  isActive={theme === 'system'}
                  showIndicator={theme === 'system'}
                />
              </MenuSection>

              {user && (
                <MenuSection title="Gerenciar">
                  <MenuButton
                    onClick={openImportModal}
                    icon={<FaFileImport className="text-indigo-500" size={16} />}
                    label="Importar Extrato"
                  />
                  <MenuButton
                    onClick={openGoalsModal}
                    icon={<FaBullseye className="text-purple-500" size={16} />}
                    label="Metas"
                  />
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
                  <MenuButton
                    onClick={toggleShowValues}
                    icon={
                      user?.showValues ? (
                        <FaEyeSlash className="text-gray-400" size={16} />
                      ) : (
                        <FaEye className="text-gray-400" size={16} />
                      )
                    }
                    label={user?.showValues ? 'Ocultar valores' : 'Mostrar valores'}
                  />
                  <MenuButton
                    onClick={handleLogout}
                    icon={<FaSignOutAlt className="text-red-500" size={16} />}
                    label="Sair"
                    danger
                  />
                </MenuSection>
              )}
            </div>
          )}

          <button
            ref={buttonRef}
            onMouseDown={(e) => setDragStart({ x: e.clientX, y: e.clientY })}
            onTouchStart={(e) => {
              const t = e.touches[0];
              setDragStart({ x: t.clientX, y: t.clientY });
            }}
            onClick={(e) => {
              if (!moved) toggleFloatingMenu();
              e.stopPropagation();
            }}
            className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
              floatingMenuOpen
                ? 'bg-red-500 hover:bg-red-600 rotate-45 scale-110'
                : themeColors.button.primary.bg
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

      {floatingMenuOpen && !isAnyModalOpen && (
        <div
          className={`fixed inset-0 z-50 ${themeColors.bg.overlay}`}
          onClick={() => setFloatingMenuOpen(false)}
        />
      )}

      <AccountsModal isOpen={accountsModalOpen} onClose={() => setAccountsModalOpen(false)} />
      <CategoriesModal isOpen={categoriesModalOpen} onClose={() => setCategoriesModalOpen(false)} />
      <GoalsModal isOpen={goalsModalOpen} onClose={() => setGoalsModalOpen(false)} />
      <ImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </div>
  );
}