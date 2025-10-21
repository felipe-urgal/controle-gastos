// app/hooks/useModal.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBodyScrollLock } from './useBodyScrollLock';

interface UseModalProps {
  onClose?: () => void;
}

export function useModal({ onClose }: UseModalProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const { lockScroll, unlockScroll } = useBodyScrollLock();

  const open = useCallback(() => {
    setIsOpen(true);
    lockScroll();
  }, [lockScroll]);

  const close = useCallback(() => {
    setIsOpen(false);
    unlockScroll();
    onClose?.();
  }, [unlockScroll, onClose]);

  // Handle ESC key - versão simplificada sem dependências problemáticas
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setIsOpen(false);
        unlockScroll();
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, unlockScroll, onClose]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (isOpen) {
        unlockScroll();
      }
    };
  }, [isOpen, unlockScroll]);

  return {
    isOpen,
    open,
    close,
  };
}
