// components/LoadingAction.tsx
"use client";

import { useThemeColors } from '@/app/hook';

interface LoadingActionProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingAction({ 
  message = 'Processando...', 
  size = 'md',
  className = "" 
}: LoadingActionProps) {
  const theme = useThemeColors();
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} border-2 ${theme.border.primary} border-t-transparent rounded-full animate-spin`} />
      <span className={`text-sm ${theme.text.primary}`}>{message}</span>
    </div>
  );
}