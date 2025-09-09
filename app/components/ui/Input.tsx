"use client"

// Hooks
import { useRef, useState } from "react";

// Icons
import { FaEye, FaEyeSlash } from 'react-icons/fa';

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
  size = 'md'
}: InputProps) => {
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

  // Classes baseadas no variant
  const variantClasses = {
    default: "bg-transparent border-0 border-b-2 rounded-none focus:ring-0",
    filled: "bg-gray-50 border-0 focus:ring-2",
    outlined: "bg-white border focus:ring-2"
  };

  // Classes baseadas no size
  const sizeClasses = {
    sm: "h-9 text-sm px-2",
    md: "h-10 text-md px-1",
    lg: "h-13 text-lg px-4",
    base: "h-11 text-base px-4",
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
            ${error ? 'text-red-500' : 
              isFocused ? 'text-blue-500' : 
              'text-gray-600'
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
              ${error ? 'text-red-500' : 
                isFocused ? 'text-blue-500' : 
                'text-gray-400'
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
            placeholder:text-gray-400
            rounded-lg
            ${variantClasses[variant]}
            ${sizeClasses[size]}
            ${icon ? 'pl-10' : 'pl-3'}
            ${isPasswordType || error || value ? 'pr-10' : ''}
            ${loading ? 'animate-pulse' : ''}
            ${isDateType ? 'cursor-pointer' : ''}
            
            ${error ? 
              `border-red-300 focus:ring-red-200 focus:border-red-400 
               text-red-600` : 
              `border-gray-200
               focus:border-blue-400 focus:ring-blue-100
               text-gray-800`
            }
            
            ${className}
          `}
          style={{ fontSize: '16px' }}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
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
                hover:bg-gray-100
                focus:outline-none focus:ring-2 focus:ring-blue-200
                ${error ? 'text-red-400' : 'text-gray-400'}
              `}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? 
                <FaEyeSlash className={iconSizeClasses[size]} /> : 
                <FaEye className={iconSizeClasses[size]} />
              }
            </button>
          )}
          
          {/*{error && !isPasswordType && (
            <FaTimes className={`text-red-400 ${iconSizeClasses[size]} ml-1`} />
          )}
          
          {value && !error && !isPasswordType && (
            <FaCheck className={`text-green-500 ${iconSizeClasses[size]} ml-1`} />
          )}*/}
        </div>
      </div>
      
      {(error || helperText) && (
        <p 
          id={`${name}-error`}
          className={`
            text-sm transition-colors duration-200
            ${error ? 'text-red-500' : 'text-gray-500'}
          `}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Input;