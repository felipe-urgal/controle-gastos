'use client'

// Hooks
import { useState, useRef, useEffect } from 'react';

// Icons
import { FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa';

// Context
import { useTheme } from "@/app/context/ThemeContext";

type SelectOption = {
  id?: string | number;
  value?: string | number;
  label?: string;
  name?: string;
};

type SelectProps = {
  options: SelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
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
  searchable?: boolean;
  searchPlaceholder?: string;
};

const Select = ({
  options,
  value,
  onChange,
  className = "",
  label,
  disabled,
  name,
  placeholder = "Selecione uma opção",
  error = "",
  loading = false,
  required = false,
  icon,
  helperText,
  variant = 'outlined',
  size = 'md',
  searchable = false,
  searchPlaceholder = "Buscar..."
}: SelectProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Cores baseadas no tema
  const themeColors = {
    background: {
      default: isDark ? 'bg-transparent' : 'bg-transparent',
      filled: isDark ? 'bg-gray-800' : 'bg-gray-50',
      outlined: isDark ? 'bg-gray-900' : 'bg-white',
      dropdown: isDark ? 'bg-gray-800' : 'bg-white',
      option: {
        default: isDark ? 'bg-gray-800' : 'bg-white',
        hover: isDark ? 'bg-gray-700' : 'bg-gray-100',
        selected: isDark ? 'bg-blue-600' : 'bg-blue-500'
      }
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
      error: isDark ? 'text-red-400' : 'text-red-500',
      option: {
        default: isDark ? 'text-gray-200' : 'text-gray-700',
        selected: isDark ? 'text-white' : 'text-white'
      }
    },
    ring: {
      focused: isDark ? 'ring-blue-500/30' : 'ring-blue-200',
      error: isDark ? 'ring-red-500/30' : 'ring-red-200'
    },
    icon: {
      default: isDark ? 'text-gray-400' : 'text-gray-400',
      focused: isDark ? 'text-blue-400' : 'text-blue-500',
      error: isDark ? 'text-red-400' : 'text-red-500'
    }
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focar no campo de busca quando o dropdown abrir
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, searchable]);

  // Classes baseadas no variant
  const variantClasses = {
    default: `border-b-2 rounded-none focus:ring-0 ${themeColors.background.default} ${themeColors.border.default}`,
    filled: `border-0 focus:ring-2 ${themeColors.background.filled} ${themeColors.border.default}`,
    outlined: `border focus:ring-2 ${themeColors.background.outlined} ${themeColors.border.default}`
  };

  const sizeClasses = {
    sm: "h-9 text-sm px-3 leading-none",
    md: "h-10 text-base px-3 leading-none",
    lg: "h-12 text-lg px-4 leading-none",
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  // Filtrar opções baseadas no termo de busca
  const filteredOptions = searchable
    ? options.filter(option => 
        (option.label || option.name || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    : options;

  // Obter o label da opção selecionada
  const selectedOption = options.find(option => 
    (option.value || option.id) === value
  );

  const displayValue = selectedOption ? 
    (selectedOption.label || selectedOption.name) : 
    placeholder;

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange('');
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Gerar uma chave única para cada opção
  const generateOptionKey = (option: SelectOption, index: number) => {
    const optionValue = option.value || option.id;
    if (optionValue !== undefined && optionValue !== null && optionValue !== '') {
      return `option-${optionValue}`;
    }
    
    const optionLabel = option.label || option.name;
    if (optionLabel) {
      return `option-${optionLabel}-${index}`;
    }
    
    return `option-${index}`;
  };

  return (
    <div className="w-full relative" ref={selectRef}>
      {label && (
        <label
          htmlFor={name}
          className={`
            block mb-2 text-sm font-medium transition-colors duration-200
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
        {/* Trigger do Select */}
        <div
          ref={triggerRef}
          id={name}
          className={`
            w-full flex items-center justify-between
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2
            disabled:opacity-60 disabled:cursor-not-allowed
            rounded-lg cursor-pointer
            ${variantClasses[variant]}
            ${sizeClasses[size]}
            ${icon ? 'pl-10 pr-10' : 'px-3'}
            ${loading ? 'animate-pulse' : ''}

            ${error ? 
              `${themeColors.border.error} focus:${themeColors.ring.error}
               ${themeColors.text.error}` : 
              isFocused ?
                `${themeColors.border.focused} focus:${themeColors.ring.focused}
                 ${themeColors.text.input}` :
                `${themeColors.border.default} focus:${themeColors.ring.focused}
                 ${themeColors.text.input}`
            }

            ${className}
          `}
          onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          tabIndex={disabled || loading ? -1 : 0}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? `${name}-label` : undefined}
          aria-required={required}
          aria-invalid={!!error}
          aria-controls={`${name}-listbox`}
        >
          <span
            className={`
              flex-1 truncate text-left leading-none
              ${value === '' ? themeColors.text.placeholder : themeColors.text.input}
            `}
          >
            {displayValue}
          </span>

          <div className="flex items-center gap-1 flex-shrink-0">
            {value && (
              <div 
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                onClick={clearSelection}
                role="button"
                tabIndex={-1}
                aria-label="Limpar seleção"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    clearSelection(e as any);
                  }
                }}
              >
                <FaTimes className={iconSizeClasses[size]} />
              </div>
            )}
            <FaChevronDown 
              className={`
                ${iconSizeClasses[size]} transition-transform duration-200 flex-shrink-0
                ${isOpen ? 'rotate-180' : ''}
                ${error ? themeColors.icon.error : themeColors.icon.default}
              `} 
            />
          </div>
        </div>

        {/* Ícone à esquerda */}
        {icon && (
          <div 
            className={`
              absolute inset-y-0 left-0 pl-3 flex items-center
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

        {/* Dropdown */}
        {isOpen && (
          <div 
            className={`
              absolute top-full left-0 right-0 z-50 mt-1
              border rounded-lg shadow-lg
              ${themeColors.background.dropdown}
              ${themeColors.border.default}
              max-h-60 overflow-y-auto
            `}
            role="listbox"
            id={`${name}-listbox`}
            aria-labelledby={label ? `${name}-label` : undefined}
          >
            {/* Campo de busca */}
            {searchable && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                <div className="relative">
                  <FaSearch className={`
                    absolute left-3 top-1/2 transform -translate-y-1/2
                    ${iconSizeClasses[size]} ${themeColors.icon.default}
                  `} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`
                      w-full pl-10 pr-3 py-2
                      rounded-lg border
                      focus:outline-none focus:ring-2
                      ${themeColors.background.outlined}
                      ${themeColors.border.default}
                      ${themeColors.text.input}
                      ${themeColors.ring.focused}
                    `}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setIsOpen(false);
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Lista de opções */}
            <div className="py-1">
              {filteredOptions.length === 0 ? (
                <div 
                  className={`px-3 py-2 text-center ${themeColors.text.placeholder}`}
                  role="option"
                  aria-selected="false"
                >
                  Nenhuma opção encontrada
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const optionValue = option.value || option.id;
                  const optionLabel = option.label || option.name;
                  const isSelected = value === optionValue;
                  
                  return (
                    <div
                      key={generateOptionKey(option, index)}
                      className={`
                        w-full text-left px-3 py-2
                        transition-colors duration-200
                        cursor-pointer
                        ${isSelected ? 
                          `${themeColors.background.option.selected} ${themeColors.text.option.selected}` : 
                          `${themeColors.background.option.default} ${themeColors.text.option.default} hover:${themeColors.background.option.hover}`
                        }
                      `}
                      onClick={() => handleSelect(optionValue!)}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(optionValue!);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setIsOpen(false);
                          triggerRef.current?.focus();
                        }
                      }}
                    >
                      {optionLabel}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p 
          className={`
            mt-2 text-sm transition-colors duration-200
            ${error ? themeColors.text.error : themeColors.text.helper}
          `}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Select;

