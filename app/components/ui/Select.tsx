'use client'

// Hooks
import { useState, useRef, useEffect } from 'react';

// Icons
import { FaChevronDown, FaSearch } from 'react-icons/fa';

// Hooks
import { useThemeColors } from '@/app/hook';

type SelectOption = {
  id?: string | number;
  value?: string | number;
  label?: string;
  name?: string;
  type?: string;
};

type SelectGroup = {
  label: string;
  options: SelectOption[];
};

type SelectProps = {
  options: SelectOption[] | SelectGroup[]; 
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
  grouped?: boolean;
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
  searchPlaceholder = "Buscar...",
  grouped = false // Nova prop
}: SelectProps) => {
  const theme = useThemeColors();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const isGrouped = grouped || (options.length > 0 && 'options' in options[0]);

  const isDisabled = disabled || loading;

  // Classes baseadas no variant
  const variantClasses = {
    default: `border-b-2 rounded-none focus:ring-0 bg-transparent ${theme.border.primary}`,
    filled: `border-0 focus:ring-2 ${theme.bg.secondary} ${theme.border.primary}`,
    outlined: `border focus:ring-2 ${theme.bg.primary} ${theme.border.primary}`
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

  const filterOptions = (optionsToFilter: SelectOption[] | SelectGroup[]) => {
    if (!searchable || !searchTerm) return optionsToFilter;

    if (isGrouped) {
      const groupedOptions = optionsToFilter as SelectGroup[];
      return groupedOptions
        .map(group => ({
          ...group,
          options: group.options.filter(option => 
            (option.label || option.name || '')
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          )
        }))
        .filter(group => group.options.length > 0);
    } else {
      const flatOptions = optionsToFilter as SelectOption[];
      return flatOptions.filter(option => 
        (option.label || option.name || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }
  };

  const findSelectedOption = () => {
    if (isGrouped) {
      const groupedOptions = options as SelectGroup[];
      for (const group of groupedOptions) {
        const found = group.options.find(option => 
          (option.value || option.id) === value
        );
        if (found) return found;
      }
    } else {
      const flatOptions = options as SelectOption[];
      return flatOptions.find(option => 
        (option.value || option.id) === value
      );
    }
    return undefined;
  };

  // Filtrar opções baseadas no termo de busca
  const filteredOptions = filterOptions(options);

  // Obter o label da opção selecionada
  const selectedOption = findSelectedOption();

  const displayValue = selectedOption ? 
    (selectedOption.label || selectedOption.name) : 
    placeholder;

  const handleSelect = (optionValue: string | number) => {
    if (isDisabled) return;
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleTriggerClick = () => {
    if (isDisabled) return;
    setIsOpen(!isOpen);
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

  const renderOptions = () => {
    if (filteredOptions.length === 0) {
      return (
        <div 
          className={`px-3 py-2 text-center ${theme.text.tertiary}`}
          role="option"
          aria-selected="false"
        >
          Nenhuma opção encontrada
        </div>
      );
    }

    if (isGrouped) {
      const groupedOptions = filteredOptions as SelectGroup[];
      return groupedOptions.map((group, groupIndex) => (
        <div key={`group-${groupIndex}`}>
          {/* Header do grupo */}
          <div 
            className={`
              px-3 py-2 text-xs font-semibold sticky top-0
              ${theme.bg.secondary} ${theme.text.secondary}
              border-b ${theme.border.primary}
            `}
          >
            {group.label}
          </div>
          
          {/* Opções do grupo */}
          {group.options.map((option, optionIndex) => {
            const optionValue = option.value || option.id;
            const optionLabel = option.label || option.name;
            const isSelected = value === optionValue;
            
            return (
              <div
                key={generateOptionKey(option, optionIndex)}
                className={`
                  w-full text-left px-3 py-2
                  transition-colors duration-200
                  cursor-pointer
                  ${isSelected ? 
                    `${theme.button.primary.bg} text-white` : 
                    `${theme.bg.primary} ${theme.text.primary} ${theme.state.hover}`
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
          })}
        </div>
      ));
    } else {
      const flatOptions = filteredOptions as SelectOption[];
      return flatOptions.map((option, index) => {
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
                `${theme.button.primary.bg} text-white` : 
                `${theme.bg.primary} ${theme.text.primary} ${theme.state.hover}`
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
      });
    }
  };

  return (
    <div className="w-full relative" ref={selectRef}>
      {label && (
        <label
          htmlFor={name}
          className={`
            block mb-2 text-sm font-medium transition-colors duration-200
            ${isDisabled ? 'opacity-60' : ''} 
            ${error ? theme.colors.error.text : 
              isFocused ? 'text-blue-500' : 
              theme.text.secondary
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
            rounded-lg cursor-pointer
            ${variantClasses[variant]}
            ${sizeClasses[size]}
            ${icon ? 'pl-10 pr-10' : 'px-3'}
            ${loading ? 'animate-pulse' : ''}
            ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}

            ${error ? 
              `${theme.input.error.border} ${theme.input.error.ring}
               ${theme.colors.error.text}` : 
              isFocused ?
                `${theme.input.focus.border} ${theme.input.focus.ring}
                 ${theme.text.primary}` :
                `${theme.border.primary} ${theme.input.focus.ring}
                 ${theme.text.primary}`
            }

            ${className}
          `}
          onClick={handleTriggerClick}
          onFocus={() => !isDisabled && setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          tabIndex={isDisabled ? -1 : 0}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? `${name}-label` : undefined}
          aria-required={required}
          aria-invalid={!!error}
          aria-controls={`${name}-listbox`}
          aria-disabled={isDisabled}
        >
          <span
            className={`
              flex-1 truncate text-left leading-none
              ${value === '' ? theme.text.tertiary : theme.text.primary}
            `}
          >
            {displayValue}
          </span>

          <div className="flex items-center gap-1 flex-shrink-0">
            <FaChevronDown 
              className={`
                ${iconSizeClasses[size]} transition-transform duration-200 flex-shrink-0
                ${isOpen ? 'rotate-180' : ''}
                ${error ? theme.colors.error.text : theme.text.tertiary}
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
              ${isDisabled ? 'opacity-60' : ''} 
              ${error ? theme.colors.error.text : 
                isFocused ? 'text-blue-500' : 
                theme.text.tertiary
              }
            `}
          >
            {icon}
          </div>
        )}

        {/* Dropdown */}
        {isOpen && !isDisabled && (
          <div 
            className={`
              absolute top-full left-0 right-0 z-50 mt-1
              border rounded-lg shadow-lg
              ${theme.bg.modal}
              ${theme.border.primary}
              max-h-60 overflow-y-auto
            `}
            role="listbox"
            id={`${name}-listbox`}
            aria-labelledby={label ? `${name}-label` : undefined}
          >
            {/* Campo de busca */}
            {searchable && (
              <div className={`p-2 border-b ${theme.border.primary}`}>
                <div className="relative">
                  <FaSearch className={`
                    absolute left-3 top-1/2 transform -translate-y-1/2
                    ${iconSizeClasses[size]} ${theme.text.tertiary}
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
                      ${theme.bg.primary}
                      ${theme.border.primary}
                      ${theme.text.primary}
                      ${theme.input.focus.ring}
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
              {renderOptions()}
            </div>
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p 
          className={`
            mt-2 text-sm transition-colors duration-200
            ${error ? theme.colors.error.text : theme.text.tertiary}
          `}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Select;
