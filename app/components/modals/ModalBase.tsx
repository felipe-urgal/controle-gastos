// app/components/modals/ModalBase.tsx
'use client';

import { ReactNode } from 'react';

import { FaTimes, FaArrowLeft } from 'react-icons/fa';

import { Button } from '@/app/components';

import { useThemeColors } from '@/app/hook';

interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  showForm: boolean;
  onBackToList?: () => void;
  children: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function ModalBase({
  isOpen,
  onClose,
  title,
  subtitle,
  showForm,
  onBackToList,
  children,
  headerActions,
  footer,
  size = 'lg'
}: ModalBaseProps) {
  const colors = useThemeColors();

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-2xl',
    lg: 'sm:max-w-4xl',
    xl: 'sm:max-w-6xl'
  };

  if (!isOpen) return null;

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 ${colors.bg.overlay} flex items-end sm:items-center justify-center z-50 p-0 animate-fade-in safe-area-container`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="status-bar-bg lg:hidden" />
      
      <div 
        className={`
          ${colors.bg.modal} w-full h-full
          ${sizeClasses[size]} sm:max-h-[90vh] sm:mx-4 overflow-hidden flex flex-col 
          animate-slide-up-mobile sm:animate-slide-up
          modal-fullscreen-mobile calendar-mobile-fullscreen
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`
          flex items-center justify-between p-4 border-b ${colors.border.primary} 
          flex-shrink-0 sticky top-0 ${colors.bg.modal} z-10
          shadow-sm sm:shadow-none pt-safe
        `}>
          <div className="flex items-center gap-3">
            {/* Botão de voltar no mobile */}
            {!showForm && onBackToList && (
              <button
                onClick={onClose}
                className="sm:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Voltar"
              >
                <FaArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div className="min-w-0 flex-1">
              <h2 
                id="modal-title"
                className={`text-lg sm:text-xl font-bold ${colors.text.primary} truncate`}
              >
                {title}
              </h2>
              {subtitle && (
                <p className={`text-xs sm:text-sm ${colors.text.secondary} mt-1 truncate`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {headerActions}
            
            {/* Botão de fechar no desktop */}
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              icon={<FaTimes size={16} />}
              className="!hidden sm:!inline-flex !p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Fechar"
              aria-label="Fechar modal"
            />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
          {children}
        </div>

        {/* Footer */}
        {footer}
      </div>
    </div>
  );
}