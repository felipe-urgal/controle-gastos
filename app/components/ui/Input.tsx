// Hooks
import { useRef } from "react";

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
};

export const Input = ({
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
  icon
}: InputProps) => {
  const isDateType = type === 'date';
  const inputRef = useRef<HTMLInputElement>(null);

  // Força a abertura do date picker ao clicar em qualquer parte do input
  const handleDateInputClick = () => {
    if (isDateType && inputRef.current && !disabled && !loading) {
      inputRef.current.showPicker();
    }
  };

  return (
    <div className="">
      {label && (
        <label
          htmlFor={name}
          className={`
            font-medium 
            ${disabled || loading ? 'opacity-40 block text-sm' : ''} 
            ${error ? 'text-red-400' : 'text-gray-400'}
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
              ${value ? 'border-blue-900 focus:ring-blue-500 text-blue-900' 
                : 'border-gray-700 focus:ring-blue-500 text-gray-700'
              }
            `}
          >
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          id={name}
          type={type}
          name={name}
          className={`
            ${className}
            ${icon ? 'pl-10' : '' }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500
            h-10 w-full pr-3 px-3 border rounded bg-gray-900 text-sm [&::-webkit-calendar-picker-indicator]:hidden
            focus:outline-none focus:ring-2 focus:border-transparent
            placeholder:text-gray-700 block rounded-lg shadow-sm transition duration-200
            ${error ? 'border-red-500 focus:ring-red-500 text-red-300' 
              : value ? 'border-blue-900 focus:ring-blue-500 text-gray-300' 
                : 'border-gray-700 focus:ring-blue-500 text-gray-500'
            }
            ${loading ? 'animate-pulse' : ''}
            ${isDateType ? 'cursor-pointer' : ''}
          `}
          style={{ fontSize: '16px' }}
          value={value}
          onChange={onChange}
          onClick={isDateType ? handleDateInputClick : undefined}
          disabled={disabled || loading}
          placeholder={isDateType && !placeholder ? 'dd/mm/aaaa' : placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      </div>
      {error && (
        <p 
          id={`${name}-error`}
          className="mt-1 text-sm text-red-500"
        >
          {error}
        </p>
      )}
    </div>
  );
};