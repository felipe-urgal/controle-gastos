// app/hooks/useThemeColors.ts
'use client';

import { useTheme } from '@/app/context/ThemeContext';

export function useThemeColors() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return {
    // Backgrounds
    bg: {
      primary: isDark ? 'bg-gray-900' : 'bg-white',
      secondary: isDark ? 'bg-gray-800' : 'bg-gray-50',
      tertiary: isDark ? 'bg-gray-700' : 'bg-gray-100',
      modal: isDark ? 'bg-gray-900' : 'bg-white',
      overlay: isDark ? 'bg-black/80' : 'bg-black/50',
    },
    // Text
    text: {
      primary: isDark ? 'text-gray-100' : 'text-gray-900',
      secondary: isDark ? 'text-gray-300' : 'text-gray-600',
      tertiary: isDark ? 'text-gray-400' : 'text-gray-500',
      inverse: isDark ? 'text-gray-900' : 'text-white',
    },
    // Borders
    border: {
      primary: isDark ? 'border-gray-700' : 'border-gray-200',
      secondary: isDark ? 'border-gray-600' : 'border-gray-300',
      accent: isDark ? 'border-blue-500' : 'border-blue-500',
    },
    // Estados
    state: {
      hover: isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50',
      active: isDark ? 'bg-gray-700' : 'bg-gray-100',
      disabled: isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400',
    },
    // Cores específicas
    colors: {
      success: {
        bg: isDark ? 'bg-green-900/20' : 'bg-green-50',
        border: isDark ? 'border-green-800' : 'border-green-200',
        text: isDark ? 'text-green-300' : 'text-green-700',
      },
      error: {
        bg: isDark ? 'bg-red-900/20' : 'bg-red-50',
        border: isDark ? 'border-red-800' : 'border-red-200',
        text: isDark ? 'text-red-300' : 'text-red-700',
      },
      warning: {
        bg: isDark ? 'bg-yellow-900/20' : 'bg-yellow-50',
        border: isDark ? 'border-yellow-800' : 'border-yellow-200',
        text: isDark ? 'text-yellow-300' : 'text-yellow-700',
      },
      info: {
        bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50',
        border: isDark ? 'border-blue-800' : 'border-blue-200',
        text: isDark ? 'text-blue-300' : 'text-blue-700',
      },
      income: {
        bg: isDark ? 'bg-green-900/20' : 'bg-green-50',
        border: isDark ? 'border-green-700' : 'border-green-200',
        text: isDark ? 'text-green-300' : 'text-green-700',
      },
      expense: {
        bg: isDark ? 'bg-red-900/20' : 'bg-red-50',
        border: isDark ? 'border-red-700' : 'border-red-200',
        text: isDark ? 'text-red-300' : 'text-red-700',
      }
    }
  };
}