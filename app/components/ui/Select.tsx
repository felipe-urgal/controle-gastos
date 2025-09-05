'use client'

// Hooks
import { useState, useRef, useEffect } from 'react';

// Icons
import { FaChevronDown } from 'react-icons/fa';

type SelectOption = {
  id?: string | number;
  value?: string | number;
  label?: string;
  name?: string;
};

type SelectProps = {
  options: SelectOption[];
  value: string | number;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
  name?: string;
  placeholder?: string;
  error?: string;
  loading?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
};

const Select = ({
  options,
  value,
  onChange,
  className = "",
  label,
  disabled,
  name,
  placeholder,
  error = "",
  loading = false,
  required = false,
  icon,
  helperText,
  variant = 'outlined',
  size = 'md'
}: SelectProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Verificar se o elemento está focado (incluindo quando o dropdown está aberto)
  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    const selectElement = selectRef.current;
    if (selectElement) {
      selectElement.addEventListener('focus', handleFocus);
      selectElement.addEventListener('blur', handleBlur);
    }

    return () => {
      if (selectElement) {
        selectElement.removeEventListener('focus', handleFocus);
        selectElement.removeEventListener('blur', handleBlur);
      }
    };
  }, []);

  // Classes baseadas no variant (iguais ao Input)
  const variantClasses = {
    default: "bg-transparent border-0 border-b-2 rounded-none focus:ring-0",
    filled: "bg-gray-50 border-0 focus:ring-2",
    outlined: "bg-white border focus:ring-2"
  };

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

  const sizeText = {
    sm: "text-sm",
    md: "text-md",
    lg: "text-lg",
    base: "text-base",
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className={`
            block mb-1 text-sm font-medium transition-colors duration-200
            ${sizeText[size]}
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
        
        <select
          ref={selectRef}
          id={name}
          name={name}
          className={`
            w-full transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2
            disabled:opacity-60 disabled:cursor-not-allowed
            rounded-lg
            appearance-none
            cursor-pointer
            ${variantClasses[variant]}
            ${sizeClasses[size]}
            ${icon ? 'pl-10' : 'pl-3'}
            ${error || value ? 'pr-10' : ''}
            ${loading ? 'animate-pulse' : ''}
            
            /* Estilo do placeholder */
            ${
              value === '' ? 
                'text-gray-400' : 
                error ? 
                  'text-red-600' : 
                  'text-gray-800'
            }
            
            ${error ? 
              `border-red-300 focus:ring-red-200 focus:border-red-400` : 
              isFocused ?
                `border-blue-400 focus:ring-blue-100 focus:border-blue-400` :
                `border-gray-200 focus:ring-blue-100 focus:border-blue-400`
            }
            
            ${className}
          `}
          value={value}
          onChange={onChange}
          disabled={disabled || loading}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        >
          {placeholder && (
            <option value="" className="text-gray-400">
              {placeholder}
            </option>
          )}

          {options.map((option) => (
            <option 
              key={option.value || option.id} 
              value={option.value || option.id} 
              className="text-gray-700 py-2"
            >
              {option.label || option.name}
            </option>
          ))}
        </select>

        {/* Ícones do lado direito */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {/* Chevron (sempre visível) */}
          <FaChevronDown 
            className={`
              ${iconSizeClasses[size]} transition-transform duration-200
              ${isFocused ? 'rotate-180 text-blue-400' : 'text-gray-400'}
              ${error ? 'text-red-400' : ''}
            `} 
          />
          
          {/* Ícones de status (error/success) */}
          {/*{error && (
            <FaTimes className={`text-red-400 ${iconSizeClasses[size]} ml-1`} />
          )}
          
          {value && !error && value !== "" && (
            <FaCheck className={`text-green-500 ${iconSizeClasses[size]} ml-1`} />
          )}*/}
        </div>
      </div>
      
      {(error || helperText) && (
        <p 
          id={`${name}-error`}
          className={`
            mt-2 text-sm transition-colors duration-200
            ${error ? 'text-red-500' : 'text-gray-500'}
          `}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Select;