'use client'

import { useRef, useState, forwardRef, InputHTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaEye, 
  FaEyeSlash, 
  FaCheckCircle, 
  FaExclamationCircle,
  FaTimes 
} from 'react-icons/fa';
import { useThemeColors } from '@/app/hook';

type InputSize = 'sm' | 'md' | 'lg';
type InputVariant = 'default' | 'filled' | 'outlined';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'size'> {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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
  rightIcon?: React.ReactNode;
  helperText?: string;
  variant?: InputVariant;
  size?: InputSize;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
  step?: string | number;
  min?: string | number;
  max?: string | number;
  pattern?: string;
  readOnly?: boolean;
  autoComplete?: string;
  success?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  maxLength?: number;
  showCount?: boolean;
  prefix?: string;
  suffix?: string;
  multiline?: boolean;
  rows?: number;
}

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(({
  value,
  onChange,
  className = "",
  label,
  disabled = false,
  name,
  placeholder,
  type = 'text',
  error = '',
  loading = false,
  required = false,
  icon,
  rightIcon,
  helperText,
  variant = 'outlined',
  size = 'md',
  onBlur,
  autoFocus = false,
  step,
  min,
  max,
  pattern,
  readOnly = false,
  autoComplete = "off",
  success = false,
  clearable = false,
  onClear,
  maxLength,
  showCount = false,
  prefix,
  suffix,
  multiline = false,
  rows = 3,
  ...props
}, ref) => {
  const colors = useThemeColors();
  
  const isDateType = type === 'date';
  const isPasswordType = type === 'password';
  const isNumberType = type === 'number';
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const internalRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const inputRef = ref || internalRef;

  // Força a abertura do date picker
  const handleDateInputClick = () => {
    if (isDateType && inputRef && 'current' in inputRef && inputRef.current && !disabled && !loading) {
      if ('showPicker' in inputRef.current) {
        (inputRef.current as HTMLInputElement).showPicker();
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      const event = {
        target: { value: '', name }
      } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
      onChange(event);
    }
  };

  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  // Classes baseadas no variant
  const variantClasses = {
    default: `border-b-2 rounded-none focus:ring-0 bg-transparent ${colors.border.primary}`,
    filled: `border-0 focus:ring-2 ${colors.bg.secondary} ${colors.border.primary}`,
    outlined: `border focus:ring-2 ${colors.bg.primary} ${colors.border.primary}`
  };

  // Classes baseadas no size
  const sizeClasses = {
    sm: "h-9 text-sm",
    md: "h-11 text-md",
    lg: "h-14 text-lg",
  };

  const textareaSizeClasses = {
    sm: "text-sm py-2",
    md: "text-md py-2.5",
    lg: "text-lg py-3",
  };

  const iconSizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  const paddingClasses = {
    left: icon || prefix ? 'pl-10' : 'pl-3',
    right: rightIcon || isPasswordType || error || success || clearable || suffix || (showCount && maxLength) ? 'pr-10' : 'pr-3'
  };

  // Determinar cor do estado
  const getStateColor = () => {
    if (error) return colors.colors.error.text;
    if (success) return colors.colors.success.text;
    if (isFocused) return 'text-purple-500';
    return colors.text.tertiary;
  };

  // CORREÇÃO: Usar colors.state.hover em vez de colors.border.hover
  const getBorderColor = () => {
    if (error) return colors.input.error.border;
    if (success) return 'border-green-500';
    if (isFocused) return colors.input.focus.border;
    if (isHovered && !disabled) return colors.state.hover; // ← CORRIGIDO
    return colors.border.primary;
  };

  // Props comuns para input/textarea
  const commonProps = {
    id: name,
    name,
    value,
    onChange,
    onFocus: (e: any) => {
      setIsFocused(true);
      props.onFocus?.(e);
    },
    onBlur: (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    disabled: disabled || loading,
    placeholder,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${name}-error` : helperText ? `${name}-helper` : undefined,
    autoFocus,
    readOnly,
    maxLength,
    ...props
  };

  // Classes comuns
  const commonClasses = `
    w-full transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2
    disabled:opacity-60 disabled:cursor-not-allowed
    ${colors.text.primary}
    rounded-xl
    ${variantClasses[variant]}
    ${getBorderColor()}
    ${isFocused ? colors.input.focus.ring : ''}
    ${loading ? 'animate-pulse cursor-wait' : ''}
    ${readOnly ? 'cursor-default bg-transparent' : ''}
    ${className}
  `;

  return (
    <div className="w-full">
      {/* Label com contador */}
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <label
            htmlFor={name}
            className={`
              text-sm font-medium transition-colors duration-200
              ${disabled || loading ? 'opacity-60' : ''} 
              ${getStateColor()}
            `}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {/* Contador de caracteres */}
          {showCount && maxLength && (
            <span className={`text-xs ${colors.text.tertiary}`}>
              {String(value).length}/{maxLength}
            </span>
          )}
        </div>
      )}
      
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Prefixo */}
        {prefix && (
          <div className={`
            absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none
            transition-colors duration-200
            ${disabled || loading ? 'opacity-60' : ''} 
            ${getStateColor()}
          `}>
            <span className="text-sm">{prefix}</span>
          </div>
        )}

        {/* Ícone esquerdo */}
        {icon && !prefix && (
          <div className={`
            absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none
            transition-colors duration-200
            ${disabled || loading ? 'opacity-60' : ''} 
            ${getStateColor()}
          `}>
            {icon}
          </div>
        )}
        
        {/* Renderiza Textarea ou Input */}
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={rows}
            className={`
              ${commonClasses}
              ${textareaSizeClasses[size]}
              ${paddingClasses.left}
              ${paddingClasses.right}
              resize-none
            `}
            style={{ fontSize: '16px' }}
            {...commonProps}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={inputType}
            step={step}
            min={min}
            max={max}
            pattern={pattern}
            autoComplete={autoComplete}
            className={`
              ${commonClasses}
              ${sizeClasses[size]}
              ${paddingClasses.left}
              ${paddingClasses.right}
              ${isDateType ? 'cursor-pointer' : ''}
            `}
            style={{ fontSize: '16px' }}
            onClick={isDateType ? handleDateInputClick : undefined}
            {...commonProps}
          />
        )}

        {/* Sufixo */}
        {suffix && (
          <div className={`
            absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none
            transition-colors duration-200
            ${disabled || loading ? 'opacity-60' : ''} 
            ${getStateColor()}
          `}>
            <span className="text-sm">{suffix}</span>
          </div>
        )}

        {/* Ícones do lado direito */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {/* Ícone personalizado à direita */}
          {rightIcon && !isPasswordType && (
            <div className="flex items-center">
              {rightIcon}
            </div>
          )}

          {/* Botão de limpar */}
          {clearable && value && !disabled && !loading && !readOnly && (
            <button
              type="button"
              onClick={handleClear}
              className={`
                p-1.5 rounded-full transition-all duration-200
                hover:bg-white/10
                focus:outline-none focus:ring-2 focus:ring-purple-500/50
                ${colors.text.tertiary} hover:${colors.text.primary}
              `}
              aria-label="Limpar campo"
            >
              <FaTimes className={iconSizeClasses[size]} />
            </button>
          )}

          {/* Ícone de sucesso */}
          {success && !error && !isPasswordType && (
            <FaCheckCircle 
              className={`${iconSizeClasses[size]} ${colors.colors.success.text}`}
            />
          )}

          {/* Ícone de erro */}
          {error && (
            <FaExclamationCircle 
              className={`${iconSizeClasses[size]} ${colors.colors.error.text}`}
            />
          )}

          {/* Botão de mostrar/ocultar senha */}
          {isPasswordType && value && !disabled && !loading && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className={`
                p-1.5 rounded-full transition-all duration-200
                hover:bg-white/10
                focus:outline-none focus:ring-2 focus:ring-purple-500/50
                ${error ? colors.colors.error.text : colors.text.tertiary}
                hover:${colors.text.primary}
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
      
      {/* Mensagens de erro/helper animadas */}
      <AnimatePresence>
        {(error || helperText) && (
          <motion.p
            key={error ? 'error' : 'helper'}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            id={error ? `${name}-error` : `${name}-helper`}
            className={`
              text-sm mt-1.5 px-1
              ${error ? colors.colors.error.text : colors.text.tertiary}
            `}
          >
            {error || helperText}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Dica para campos numéricos */}
      {isNumberType && min !== undefined && max !== undefined && !error && (
        <p className={`text-xs mt-1 px-1 ${colors.text.tertiary}`}>
          Valor entre {min} e {max}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
