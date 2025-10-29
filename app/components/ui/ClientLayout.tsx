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
  FaTrash
} from 'react-icons/fa';

const MENU_POSITION_KEY = 'floating-menu-position';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [floatingMenuOpen, setFloatingMenuOpen] = useState(false);
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [moved, setMoved] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const { logout, toggleShowValues, user, deleteAccount } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isAnyModalOpen } = useUI();
  const themeColors = useThemeColors();

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const pathname = usePathname();
  const isCalendarPage = pathname === '/calendario';

  const isAnyLocalModalOpen = accountsModalOpen || categoriesModalOpen || goalsModalOpen || importModalOpen;

  useEffect(() => {
    const loadSavedPosition = () => {
      try {
        const saved = localStorage.getItem(MENU_POSITION_KEY);
        if (saved) {
          const { x, y } = JSON.parse(saved);
          
          const isValidPosition = 
            x >= 0 && x <= window.innerWidth - 60 && 
            y >= 0 && y <= window.innerHeight - 60;
          
          if (isValidPosition) {
            setMenuPosition({ x, y });
            return;
          }
        }
      } catch (error) {
        console.warn('Erro ao carregar posição do menu:', error);
      }
      
      setMenuPosition({
        x: window.innerWidth - 80,
        y: window.innerHeight - 100,
      });
    };

    loadSavedPosition();
  }, []);

  useEffect(() => {
    const savePosition = () => {
      try {
        localStorage.setItem(MENU_POSITION_KEY, JSON.stringify(menuPosition));
      } catch (error) {
        console.warn('Erro ao salvar posição do menu:', error);
      }
    };

    savePosition();
  }, [menuPosition]);

  useEffect(() => {
    const handleResize = () => {
      setMenuPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 60),
        y: Math.min(prev.y, window.innerHeight - 60),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const calculateMenuStyle = () => {
      const middleY = window.innerHeight / 2;
      const middleX = window.innerWidth / 2;

      const openUp = menuPosition.y > middleY;  
      const openLeft = menuPosition.x > middleX;

      const menuWidth = 200;
      const menuHeight = 400;

      let top = openUp ? -menuHeight : 60;
      const left = openLeft ? -menuWidth + 48 : 0;
      const right = openLeft ? 0 : undefined;
     
      if (openUp && menuPosition.y - menuHeight < 0) {
        top = 60;
      }
      if (!openUp && menuPosition.y + menuHeight > window.innerHeight) {
        top = -menuHeight;
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

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFloatingMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  useEffect(() => {
    const preventTouchDuringDrag = (e: TouchEvent) => {
      if (dragStart) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventTouchDuringDrag, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventTouchDuringDrag);
    };
  }, [dragStart]);

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
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [dragStart]);

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

  const handleDeleteAccount = useCallback(async () => {
    try {
      const confirmed = window.confirm(
        'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita e todos os seus dados serão permanentemente removidos.'
      );
      
      if (!confirmed) return;

      const result = await deleteAccount();
      
      if (result.success) {
        alert('Conta excluída com sucesso.');
        setFloatingMenuOpen(false);
      } else {
        alert(`Erro ao excluir conta: ${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      alert('Erro ao excluir conta. Tente novamente.');
    }
  }, [deleteAccount]);

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

  return (
    <div className={`full-viewport ${themeColors.bg.primary} relative main-container h-screen`}>
      {children}

      {user && !isAnyModalOpen && !isAnyLocalModalOpen && (
        <div
          className="fixed z-52 pointer-events-none"
          ref={menuRef}
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          {floatingMenuOpen && (
            <div 
              style={menuStyle} 
              className="animate-slide-up pointer-events-auto" 
              role="menu"
            >
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
                </MenuSection>
              )}

              {user && (
                <MenuSection title="Conta">
                  <MenuButton
                    onClick={handleLogout}
                    icon={<FaSignOutAlt className="text-orange-500" size={16} />}
                    label="Sair"
                  />
                  <MenuButton
                    onClick={handleDeleteAccount}
                    icon={<FaTrash className="text-red-500" size={16} />}
                    label="Excluir Conta"
                    danger
                  />
                </MenuSection>
              )}

            </div>
          )}

          <button
            ref={buttonRef}
            onMouseDown={(e) => {
              setDragStart({ x: e.clientX, y: e.clientY });
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              setDragStart({ x: t.clientX, y: t.clientY });
              e.stopPropagation();
            }}
            onClick={(e) => {
              if (!moved) toggleFloatingMenu();
              e.stopPropagation();
            }}
            className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 pointer-events-auto ${
              floatingMenuOpen
                ? 'bg-red-500 hover:bg-red-600 rotate-45 scale-110'
                : themeColors.button.primary.bg
            }`}
            style={{
              cursor: dragStart ? 'grabbing' : 'grab',
            }}
          >
            {floatingMenuOpen ? (
              <FaTimes className="text-white text-lg" />
            ) : (
              getThemeIcon()
            )}
          </button>
        </div>
      )}

      {user && floatingMenuOpen && !isAnyModalOpen && !isAnyLocalModalOpen && (
        <div
          className={`fixed inset-0 z-50 ${themeColors.bg.overlay} pointer-events-auto`}
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
