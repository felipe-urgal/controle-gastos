// app/components/modals/ModalMessage.tsx - CORRIGIDO
'use client';

import { Button } from '@/app/components';
import { useThemeColors } from '@/app/hook';
import { FaTimes } from 'react-icons/fa';

interface ModalMessageProps {
  type: 'error' | 'success' | 'info'; // Adicionei 'info' aqui
  message: string;
  onClose: () => void;
}

export default function ModalMessage({ type, message, onClose }: ModalMessageProps) {
  const colors = useThemeColors();

  // Estilos para cada tipo
  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: colors.colors.error.bg,
          border: colors.colors.error.border,
          text: colors.colors.error.text
        };
      case 'success':
        return {
          bg: colors.colors.success.bg,
          border: colors.colors.success.border,
          text: colors.colors.success.text
        };
      case 'info':
        return {
          bg: colors.colors.info?.bg || 'bg-blue-50 dark:bg-blue-900/20',
          border: colors.colors.info?.border || 'border-blue-200 dark:border-blue-800',
          text: colors.colors.info?.text || 'text-blue-800 dark:text-blue-300'
        };
      default:
        return {
          bg: colors.colors.info?.bg || 'bg-blue-50 dark:bg-blue-900/20',
          border: colors.colors.info?.border || 'border-blue-200 dark:border-blue-800',
          text: colors.colors.info?.text || 'text-blue-800 dark:text-blue-300'
        };
    }
  };

  const styles = getStyles();

  // Cor do ponto indicador
  const getDotColor = () => {
    switch (type) {
      case 'error': return 'bg-red-500';
      case 'success': return 'bg-green-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-blue-500';
    }
  };

  // Role para acessibilidade
  const getRole = () => {
    switch (type) {
      case 'error': return 'alert';
      case 'success': return 'status';
      case 'info': return 'status';
      default: return 'status';
    }
  };

  return (
    <div 
      className={`
        mx-4 mt-2 p-3 rounded-xl border flex-shrink-0 animate-fade-in
        ${styles.bg} ${styles.border} ${styles.text}
      `}
      role={getRole()}
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div 
          className={`w-2 h-2 rounded-full flex-shrink-0 ${getDotColor()}`} 
          aria-hidden="true"
        />
        <p className="text-sm flex-1">
          {message}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          icon={<FaTimes size={12} />}
          className="!p-1 flex-shrink-0"
          title="Fechar mensagem"
          aria-label="Fechar mensagem"
        />
      </div>
    </div>
  );
}
