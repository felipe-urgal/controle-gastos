// app/hooks/useThemeColors.ts
'use client';

import { useTheme } from '@/app/context';

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
      overlay: isDark ? 'bg-black/70' : 'bg-black/70',
      transparent: 'bg-transparent',
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
    },
    // Novas cores para botões
    button: {
      primary: {
        bg: isDark 
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
          : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
        text: 'text-white',
        shadow: isDark 
          ? 'shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30' 
          : 'shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30',
        focus: isDark ? 'focus:ring-blue-500/40' : 'focus:ring-blue-400/40'
      },
      secondary: {
        bg: isDark
          ? 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700'
          : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800',
        text: 'text-white',
        shadow: isDark
          ? 'shadow-lg shadow-slate-500/20 hover:shadow-slate-500/30'
          : 'shadow-lg shadow-slate-500/20 hover:shadow-slate-500/30',
        focus: isDark ? 'focus:ring-slate-400/40' : 'focus:ring-slate-400/40'
      },
      danger: {
        bg: isDark
          ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
          : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
        text: 'text-white',
        shadow: isDark
          ? 'shadow-lg shadow-red-600/20 hover:shadow-red-600/30'
          : 'shadow-lg shadow-red-500/20 hover:shadow-red-500/30',
        focus: isDark ? 'focus:ring-red-500/40' : 'focus:ring-red-400/40'
      },
      success: {
        bg: isDark
          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
          : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
        text: 'text-white',
        shadow: isDark
          ? 'shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30'
          : 'shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30',
        focus: isDark ? 'focus:ring-emerald-500/40' : 'focus:ring-emerald-400/40'
      },
      ghost: {
        bg: isDark
          ? 'bg-transparent hover:bg-slate-800'
          : 'bg-transparent hover:bg-slate-100',
        text: isDark
          ? 'text-slate-300 hover:text-slate-100'
          : 'text-slate-700 hover:text-slate-900',
        shadow: '',
        focus: isDark ? 'focus:ring-slate-600/40' : 'focus:ring-slate-400/20'
      },
      link: {
        bg: 'bg-transparent',
        text: isDark
          ? 'text-blue-400 hover:text-blue-300'
          : 'text-blue-600 hover:text-blue-800',
        shadow: '',
        focus: isDark ? 'focus:ring-blue-600/40' : 'focus:ring-blue-400/20',
        extra: 'underline-offset-4 hover:underline p-0'
      },
      outline: {
        bg: isDark
          ? 'bg-transparent hover:bg-blue-400'
          : 'bg-transparent hover:bg-blue-500',
        text: isDark
          ? 'text-blue-400 hover:text-white'
          : 'text-blue-600 hover:text-white',
        border: isDark
          ? 'border-2 border-blue-400'
          : 'border-2 border-blue-500',
        shadow: '',
        focus: isDark ? 'focus:ring-blue-600/40' : 'focus:ring-blue-400/40'
      }
    },
    // Utilitários
    utils: {
      glowEffect: isDark ? 'bg-white/5' : 'bg-white/10'
    },
    // Novas utilidades para inputs
    input: {
      focus: {
        ring: isDark ? 'focus:ring-blue-500/30' : 'focus:ring-blue-200',
        border: isDark ? 'focus:border-blue-400' : 'focus:border-blue-500'
      },
      error: {
        ring: isDark ? 'focus:ring-red-500/30' : 'focus:ring-red-200',
        border: isDark ? 'border-red-500' : 'border-red-300'
      }
    },

    calendar: {
      bg: isDark ? 'bg-gray-800' : 'bg-white',
      border: isDark ? 'border-gray-700' : 'border-gray-200',
      day: {
        bg: isDark ? 'bg-gray-800' : 'bg-white',
        bgCurrent: isDark ? 'bg-gray-700' : 'bg-gray-50',
        bgToday: isDark ? 'bg-blue-900/30' : 'bg-blue-50',
        text: isDark ? 'text-gray-100' : 'text-gray-800',
        textMuted: isDark ? 'text-gray-700' : 'text-gray-400',
        bgOther: isDark ? 'bg-gray-500/50' : 'bg-gray-100/50',
      },
      header: {
        bg: isDark ? 'bg-gray-800' : 'bg-white',
      },
      skeleton: {
        bg: isDark ? 'bg-gray-700' : 'bg-gray-300',
        light: isDark ? 'bg-gray-600' : 'bg-gray-200',
      }
    }
  };
}
