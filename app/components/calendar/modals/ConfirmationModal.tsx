// components/ConfirmationModal.tsx
"use client";

import { useThemeColors } from '@/app/hook';
import { Button } from '@/app/components';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message = "Tem certeza que deseja realizar esta ação?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = 'danger',
  isLoading = false
}: ConfirmationModalProps) {
  const colors = useThemeColors();

  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: FaExclamationTriangle,
      iconColor: 'text-red-500',
      buttonVariant: 'danger' as const,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800'
    },
    warning: {
      icon: FaExclamationTriangle,
      iconColor: 'text-yellow-500',
      buttonVariant: 'warning' as const,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    info: {
      icon: FaExclamationTriangle,
      iconColor: 'text-blue-500',
      buttonVariant: 'primary' as const,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    }
  };

  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className={`
          ${colors.bg.modal} rounded-2xl shadow-xl w-full max-w-md 
          animate-scale-in
          ${config.bgColor} ${config.borderColor} border
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
              {title}
            </h3>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            icon={<FaTimes size={14} />}
            className="!p-2"
          />
        </div>

        {/* Message */}
        <div className="px-6 py-2">
          <p className={`${colors.text.primary} leading-relaxed`}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}