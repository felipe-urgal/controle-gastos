'use client'

// icons
import { FaTimes, FaCheck, FaChevronDown } from 'react-icons/fa';

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
}: SelectProps) => {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className={`
            block text-sm font-medium mb-2 transition-colors duration-200
            ${disabled || loading ? 'opacity-50' : ''} 
            ${error ? 'text-rose-500' : value ? 'text-gray-700' : 'text-gray-500'}
          `}
        >
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div 
            className={`
              absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10
              transition-colors duration-200
              ${disabled || loading ? 'opacity-50' : ''} 
              ${error ? 'text-rose-500' : value 
                ? 'text-indigo-500' 
                : 'text-gray-400'
              }
            `}
          >
            {icon}
          </div>
        )}
        <select
          id={name}
          name={name}
          className={`
            ${className}
            ${icon ? 'pl-10' : 'pl-4'}
            disabled:opacity-50 disabled:cursor-not-allowed
            h-12 w-full pr-10 border bg-white text-gray-800
            focus:outline-none focus:ring-2 focus:border-transparent
            appearance-none rounded-lg shadow-sm transition-all duration-200
            cursor-pointer
            ${error 
              ? 'border-rose-300 focus:ring-rose-200 focus:shadow-rose-100' 
              : value 
                ? 'border-indigo-300 focus:ring-indigo-200 focus:shadow-indigo-100' 
                : 'border-gray-300 focus:ring-indigo-200 focus:shadow-indigo-100'
            }
            ${loading ? 'animate-pulse bg-gray-100' : ''}
            hover:border-indigo-400
          `}
          value={value}
          onChange={(e) => onChange(e)}
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
        
        {/* Custom Chevron */}
        <div className={`
          absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none
          transition-colors duration-200
          ${disabled || loading ? 'opacity-50' : ''} 
          ${error ? 'text-rose-500' : 'text-gray-400'}
        `}>
          <FaChevronDown className="w-3 h-3" />
        </div>
        
        {/* Status Icons */}
        <div className={`
          absolute inset-y-0 right-7 flex items-center pointer-events-none
          transition-all duration-200
          ${disabled || loading ? 'opacity-50' : ''}
        `}>
          {error && <FaTimes className="text-rose-500 w-3 h-3" /> }
          {value && !error && <FaCheck className="text-emerald-500 w-3 h-3" /> }
        </div>
      </div>
      {error && (
        <p 
          id={`${name}-error`}
          className="mt-2 text-xs text-rose-500 flex items-center gap-1"
        >
          <FaTimes className="w-2.5 h-2.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;