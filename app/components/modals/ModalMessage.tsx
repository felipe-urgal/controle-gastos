// app/components/modals/ModalMessage.tsx
'use client';

import { Button } from '@/app/components';

import { useThemeColors } from '@/app/hook';

import { FaTimes } from 'react-icons/fa';

interface ModalMessageProps {
  type: 'error' | 'success';
  message: string;
  onClose: () => void;
}

export default function ModalMessage({ type, message, onClose }: ModalMessageProps) {
  const colors = useThemeColors();

  const styles = type === 'error' 
    ? {
        bg: colors.colors.error.bg,
        border: colors.colors.error.border,
        text: colors.colors.error.text
      }
    : {
        bg: colors.colors.success.bg,
        border: colors.colors.success.border,
        text: colors.colors.success.text
      };

  return (
    <div 
      className={`
        mx-4 mt-2 p-3 rounded-xl border flex-shrink-0 animate-fade-in
        ${styles.bg} ${styles.border} ${styles.text}
      `}
      role={type === 'error' ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div 
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`} 
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