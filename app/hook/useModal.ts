// app/hooks/useModal.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseModalProps {
  onClose?: () => void;
}

export function useModal({ onClose }: UseModalProps = {}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (isOpen) {
      }
    };
  }, [isOpen]);

  return {
    isOpen,
    open,
    close,
  };
}
