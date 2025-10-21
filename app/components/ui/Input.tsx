"use client"

// Hooks
import { useRef, useState } from "react";

// Icons
import { FaEye, FaEyeSlash } from 'react-icons/fa';

// Hooks
import { useThemeColors } from '@/app/hook';

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
  onBlur,
  autoFocus = false,
  // Novas propriedades
  step,
  min,
  max,
  pattern,
  readOnly = false,
  autoComplete = "off"
}: any) => {
  const colors = useThemeColors();
  
  const isDateType = type === 'date';
  const isPasswordType = type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null); // Fixed: Added proper type

  // Força a abertura do date picker ao clicar em qualquer parte do input
  const handleDateInputClick = () => {
    if (isDateType && inputRef.current && !disabled && !loading) {
      inputRef.current.showPicker(); // Now TypeScript knows this method exists
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  // Classes baseadas no variant
  const variantClasses: any = {
    default: `border-b-2 rounded-none focus:ring-0 bg-transparent ${colors.border.primary}`,
    filled: `border-0 focus:ring-2 ${colors.bg.secondary} ${colors.border.primary}`,
    outlined: `border focus:ring-2 ${colors.bg.primary} ${colors.border.primary}`
  };

  // Classes baseadas no size
  const sizeClasses: any = {
    sm: "h-9 text-sm px-2",
    md: "h-10 text-md px-3",
    lg: "h-12 text-lg px-4",
  };

  const iconSizeClasses: any = {
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
            ${error ? colors.colors.error.text : 
              isFocused ? 'text-blue-500' : 
              colors.text.secondary
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
              ${error ? colors.colors.error.text : 
                isFocused ? 'text-blue-500' : 
                colors.text.tertiary
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
            ${colors.text.tertiary}
            rounded-lg
            ${variantClasses[variant]}
            ${sizeClasses[size]}
            ${icon ? 'pl-10' : 'pl-3'}
            ${isPasswordType || error || value ? 'pr-10' : ''}
            ${loading ? 'animate-pulse' : ''}
            ${isDateType ? 'cursor-pointer' : ''}
            ${readOnly ? 'cursor-default' : ''}
            
            ${error ? 
              `${colors.input.error.border} ${colors.input.error.ring}
               ${colors.colors.error.text}` : 
              isFocused ?
                `${colors.input.focus.border} ${colors.input.focus.ring}
                 ${colors.text.primary}` :
                `${colors.border.primary} ${colors.input.focus.ring}
                 ${colors.text.primary}`
            }
            
            ${className}
          `}
          style={{ fontSize: '16px' }}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={(e: any) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          onClick={isDateType ? handleDateInputClick : undefined}
          disabled={disabled || loading}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          // Novas propriedades
          step={step}
          min={min}
          max={max}
          pattern={pattern}
          readOnly={readOnly}
        />

        {/* Ícones do lado direito */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isPasswordType && value && !disabled && !loading && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className={`
                p-1 rounded-full transition-colors duration-200
                ${colors.state.hover}
                focus:outline-none focus:ring-2 focus:ring-blue-200
                ${error ? colors.colors.error.text : colors.text.tertiary}
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
            ${error ? colors.colors.error.text : colors.text.tertiary}
          `}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
