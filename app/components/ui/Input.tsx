"use client"

// Hooks
import { useRef, useState } from "react";

// Icons
import { FaEye, FaEyeSlash } from 'react-icons/fa';

// Context
import { useTheme } from "@/app/context/ThemeContext";

type InputProps = {
  value: string | number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
  name?: string;
  placeholder?: string;
  type?: string;
  error?: string;
  loading?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
};

const Input = ({
  value,
  onChange,
  className = "",
  label,
  disabled,
  name,
  placeholder,
  type = 'text',
  error = '',
  loading = false,
  required = false,
  icon,
  helperText,
  variant = 'outlined',
  size = 'md',
  onBlur
}: InputProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const isDateType = type === 'date';
  const isPasswordType = type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Força a abertura do date picker ao clicar em qualquer parte do input
  const handleDateInputClick = () => {
    if (isDateType && inputRef.current && !disabled && !loading) {
      inputRef.current.showPicker();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  // Cores baseadas no tema
  const themeColors = {
    background: {
      default: isDark ? 'bg-transparent' : 'bg-transparent',
      filled: isDark ? 'bg-gray-800' : 'bg-gray-50',
      outlined: isDark ? 'bg-gray-900' : 'bg-white'
    },
    border: {
      default: isDark ? 'border-gray-600' : 'border-gray-300',
      focused: isDark ? 'border-blue-400' : 'border-blue-400',
      error: isDark ? 'border-red-500' : 'border-red-300'
    },
    text: {
      label: isDark ? 'text-gray-200' : 'text-gray-700',
      input: isDark ? 'text-gray-100' : 'text-gray-800',
      placeholder: isDark ? 'text-gray-400' : 'text-gray-400',
      helper: isDark ? 'text-gray-400' : 'text-gray-500',
      error: isDark ? 'text-red-400' : 'text-red-500'
    },
    ring: {
      focused: isDark ? 'ring-blue-500/30' : 'ring-blue-200',
      error: isDark ? 'ring-red-500/30' : 'ring-red-200'
    },
    icon: {
      default: isDark ? 'text-gray-400' : 'text-gray-400',
      focused: isDark ? 'text-blue-400' : 'text-blue-500',
      error: isDark ? 'text-red-400' : 'text-red-500'
    },
    hover: {
      button: isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
    }
  };

  // Classes baseadas no variant
  const variantClasses = {
    default: `border-b-2 rounded-none focus:ring-0 ${themeColors.background.default} ${themeColors.border.default}`,
    filled: `border-0 focus:ring-2 ${themeColors.background.filled} ${themeColors.border.default}`,
    outlined: `border focus:ring-2 ${themeColors.background.outlined} ${themeColors.border.default}`
  };

  // Classes baseadas no size
  const sizeClasses = {
    sm: "h-9 text-sm px-2",
    md: "h-10 text-md px-3",
    lg: "h-12 text-lg px-4",
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className={`
            block mb-1 text-sm font-medium transition-colors duration-200
            ${disabled || loading ? 'opacity-60' : ''} 
            ${error ? themeColors.text.error : 
              isFocused ? 'text-blue-500' : 
              themeColors.text.label
            }
          `}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div 
            className={`
              absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none
              transition-colors duration-200
              ${disabled || loading ? 'opacity-60' : ''} 
              ${error ? themeColors.icon.error : 
                isFocused ? themeColors.icon.focused : 
                themeColors.icon.default
              }
            `}
          >
            {icon}
          </div>
        )}
        
        <input
          ref={inputRef}
          id={name}
          type={inputType}
          name={name}
          className={`
            w-full transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2
            disabled:opacity-60 disabled:cursor-not-allowed
            ${themeColors.text.placeholder}
            rounded-lg
            ${variantClasses[variant]}
            ${sizeClasses[size]}
            ${icon ? 'pl-10' : 'pl-3'}
            ${isPasswordType || error || value ? 'pr-10' : ''}
            ${loading ? 'animate-pulse' : ''}
            ${isDateType ? 'cursor-pointer' : ''}
            
            ${error ? 
              `${themeColors.border.error} focus:${themeColors.ring.error} focus:${themeColors.border.error}
               ${themeColors.text.error}` : 
              `${themeColors.border.default}
               focus:${themeColors.border.focused} focus:${themeColors.ring.focused}
               ${themeColors.text.input}`
            }
            
            ${className}
          `}
          style={{ fontSize: '16px' }}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          onClick={isDateType ? handleDateInputClick : undefined}
          disabled={disabled || loading}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          autoComplete="off"
        />

        {/* Ícones do lado direito */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isPasswordType && value && !disabled && !loading && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className={`
                p-1 rounded-full transition-colors duration-200
                ${themeColors.hover.button}
                focus:outline-none focus:ring-2 focus:ring-blue-200
                ${error ? themeColors.icon.error : themeColors.icon.default}
              `}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? 
                <FaEyeSlash className={iconSizeClasses[size]} /> : 
                <FaEye className={iconSizeClasses[size]} />
              }
            </button>
          )}
        </div>
      </div>
      
      {(error || helperText) && (
        <p 
          id={`${name}-error`}
          className={`
            text-sm transition-colors duration-200 mt-1
            ${error ? themeColors.text.error : themeColors.text.helper}
          `}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
