'use client'

// Hooks
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

// Icons
import { FaChevronDown, FaSearch, FaCheck } from 'react-icons/fa';

// Hooks
import { useThemeColors } from '@/app/hook';
import { motion, AnimatePresence } from 'framer-motion';

type SelectOption = {
  id?: string | number;
  value?: string | number;
  label?: string;
  name?: string;
  type?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
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
  clearable?: boolean;
  onBlur?: () => void;
  renderOption?: (option: SelectOption) => React.ReactNode;
  'aria-describedby'?: string;
};

const Select = ({
  options,
  value,
  onChange,
  className = "",
  label,
  disabled = false,
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
  grouped = false,
  clearable = false,
  onBlur,
  renderOption: customRenderOption,
  'aria-describedby': ariaDescribedby,
}: SelectProps) => {
  const theme = useThemeColors();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<(HTMLDivElement | null)[]>([]);

  const isGrouped = useMemo(() => 
    grouped || (options.length > 0 && 'options' in options[0]), 
    [options, grouped]
  );

  const isDisabled = disabled || loading;

  // Filtrar opções baseadas no termo de busca
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;

    if (isGrouped) {
      const groupedOptions = options as SelectGroup[];
      return groupedOptions
        .map(group => ({
          ...group,
          options: group.options.filter(option => 
            !option.disabled && (
              option.label || option.name || ''
            ).toLowerCase().includes(searchTerm.toLowerCase())
          )
        }))
        .filter(group => group.options.length > 0);
    } else {
      const flatOptions = options as SelectOption[];
      return flatOptions.filter(option => 
        !option.disabled && (
          option.label || option.name || ''
        ).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }, [options, searchTerm, searchable, isGrouped]);

  // Encontrar opção selecionada
  const selectedOption = useMemo(() => {
    if (!value) return undefined;
    
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
  }, [options, value, isGrouped]);

  // Encontrar o ícone da opção selecionada
  const selectedIcon = useMemo(() => {
    if (selectedOption?.icon) return selectedOption.icon;
    
    // Se não tiver ícone na opção, tenta encontrar por tipo
    if (selectedOption?.type === 'INCOME') return <FaSearch className="text-green-400" />;
    if (selectedOption?.type === 'EXPENSE') return <FaSearch className="text-red-400" />;
    
    return icon; // fallback para o ícone padrão
  }, [selectedOption, icon]);

  const displayValue = selectedOption ? 
    (selectedOption.label || selectedOption.name) : 
    placeholder;

  // Handlers memoizados
  const handleSelect = useCallback((optionValue: string | number) => {
    if (isDisabled) return;
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
    triggerRef.current?.focus();
  }, [isDisabled, onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDisabled) return;
    onChange('');
    setSearchTerm('');
  }, [isDisabled, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isDisabled) return;
    
    // Função para contar opções dentro do handleKeyDown
    const countOptions = () => {
      if (isGrouped) {
        return (filteredOptions as SelectGroup[]).reduce(
          (acc, group) => acc + group.options.length, 0
        );
      }
      return (filteredOptions as SelectOption[]).length;
    };
    
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(prev => !prev);
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case 'ArrowDown':
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
        } else {
          e.preventDefault();
          setHighlightedIndex(prev => {
            const total = countOptions();
            return prev < total - 1 ? prev + 1 : prev;
          });
        }
        break;
      case 'ArrowUp':
        if (isOpen) {
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : -1
          );
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
        }
        break;
    }
  }, [isDisabled, isOpen, isGrouped, filteredOptions]);

  // Rolar para o item destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsRef.current[highlightedIndex]) {
      optionsRef.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [highlightedIndex]);

  // Focar no campo de busca quando o dropdown abrir
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      setHighlightedIndex(-1);
    }
  }, [isOpen, searchable]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        onBlur?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

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
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

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

  const renderOptionItem = (option: SelectOption, index: number, groupLabel?: string) => {
    const optionValue = option.value || option.id;
    const optionLabel = option.label || option.name;
    const isSelected = value === optionValue;
    const isHighlighted = highlightedIndex === index;
    const isOptionDisabled = option.disabled;

    // Se tiver uma renderização personalizada, usa ela
    if (customRenderOption) {
      return (
        <div
          key={generateOptionKey(option, index)}
          ref={el => { optionsRef.current[index] = el; }}
          className={`
            w-full text-left px-3 py-2.5
            transition-all duration-150
            cursor-pointer
            ${isOptionDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isSelected ? 
              'bg-purple-600 text-white' : 
              isHighlighted ?
                'bg-slate-700 text-white' :
                'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }
          `}
          onClick={() => !isOptionDisabled && handleSelect(optionValue!)}
          role="option"
          aria-selected={isSelected}
          aria-disabled={isOptionDisabled}
          tabIndex={-1}
          data-group={groupLabel}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {customRenderOption(option)}
            </div>
            {isSelected && (
              <FaCheck className={`${iconSizeClasses[size]} shrink-0 ml-2`} />
            )}
          </div>
        </div>
      );
    }

    // Renderização padrão
    return (
      <div
        key={generateOptionKey(option, index)}
        ref={el => { optionsRef.current[index] = el; }}
        className={`
          w-full text-left px-3 py-1
          transition-all duration-150
          cursor-pointer
          flex items-center justify-between gap-2
          ${isOptionDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isSelected ? 
            'bg-purple-600 text-white' : 
            isHighlighted ?
              'bg-slate-700 text-white' :
              'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }
        `}
        onClick={() => !isOptionDisabled && handleSelect(optionValue!)}
        role="option"
        aria-selected={isSelected}
        aria-disabled={isOptionDisabled}
        tabIndex={-1}
        data-group={groupLabel}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {option.icon && (
            <span className="shrink-0">{option.icon}</span>
          )}
          <span className="truncate">{optionLabel}</span>
        </div>
        
        {isSelected && (
          <FaCheck className={`${iconSizeClasses[size]} shrink-0`} />
        )}
      </div>
    );
  };

  const renderOptions = () => {
    if (filteredOptions.length === 0) {
      return (
        <div 
          className="px-4 py-3 text-center text-slate-400"
          role="option"
          aria-selected="false"
        >
          {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma opção disponível'}
        </div>
      );
    }

    if (isGrouped) {
      const groupedOptions = filteredOptions as SelectGroup[];
      let globalIndex = 0;
      
      return groupedOptions.map((group) => (
        <div key={`group-${group.label}`}>
          {/* Header do grupo */}
          <div 
            className="
              px-3 py-3 font-semibold sticky top-0 z-10
              bg-slate-700 text-slate-300
              border-b border-slate-600 text-xs
            "
          >
            {group.label}
          </div>
          
          {/* Opções do grupo */}
          {group.options.map((option) => {
            const currentIndex = globalIndex++;
            return renderOptionItem(option, currentIndex, group.label);
          })}
        </div>
      ));
    } else {
      const flatOptions = filteredOptions as SelectOption[];
      return flatOptions.map((option, index) => 
        renderOptionItem(option, index)
      );
    }
  };

  // Ícone a ser mostrado no trigger
  const triggerIcon = selectedIcon || icon;

  return (
    <div className="w-full relative" ref={selectRef}>
      {label && (
        <label
          htmlFor={name}
          className={`
            block mb-2 text-sm font-medium transition-colors duration-200
            ${isDisabled ? 'opacity-60' : ''} 
            ${error ? 'text-red-500' : 
              isFocused ? 'text-purple-500' : 
              'text-slate-400'
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
            rounded-xl
            ${variantClasses[variant]}
            ${sizeClasses[size]}
            ${icon || triggerIcon ? 'pl-10' : 'pl-4'}
            pr-4
            ${loading ? 'animate-pulse' : ''}
            ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}

            ${error ? 
              'border-red-500 focus:ring-red-500/20 text-red-500' : 
              isFocused ?
                'border-purple-500 focus:ring-purple-500/20 text-white' :
                'border-slate-700 text-slate-300'
            }

            ${className}
          `}
          onClick={() => !isDisabled && setIsOpen(prev => !prev)}
          onFocus={() => !isDisabled && setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
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
          aria-describedby={ariaDescribedby}
        >
          {/* Ícone à esquerda */}
          {(icon || triggerIcon) && (
            <div className={`
              absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none
              transition-colors duration-200
              ${isDisabled ? 'opacity-60' : ''} 
              ${error ? 'text-red-500' : 
                isFocused ? 'text-purple-500' : 
                'text-slate-400'
              }
            `}>
              {triggerIcon}
            </div>
          )}

          <span
            className={`
              flex-1 truncate text-left
              ${!selectedOption ? 'text-slate-500' : 'text-white'}
            `}
          >
            {displayValue}
          </span>

          <div className="flex items-center gap-1 flex-shrink-0">
            {clearable && selectedOption && !isDisabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Limpar seleção"
              >
                ×
              </button>
            )}
            
            <FaChevronDown 
              className={`
                ${iconSizeClasses[size]} transition-transform duration-200
                ${isOpen ? 'rotate-180' : ''}
                ${error ? 'text-red-500' : 'text-slate-400'}
              `} 
            />
          </div>
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && !isDisabled && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="
                absolute top-full left-0 right-0 z-50 mt-1
                border rounded-xl shadow-2xl
                bg-slate-800
                border-slate-700
                max-h-72 overflow-y-auto
                backdrop-blur-sm
              "
              role="listbox"
              id={`${name}-listbox`}
              aria-labelledby={label ? `${name}-label` : undefined}
            >
              {/* Campo de busca */}
              {searchable && (
                <div className="sticky top-0 z-10 p-2 border-b border-slate-700 bg-slate-800">
                  <div className="relative">
                    <FaSearch className="
                      absolute left-3 top-1/2 transform -translate-y-1/2
                      text-slate-400
                    " />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="
                        w-full pl-10 pr-3 py-2.5
                        rounded-lg border
                        focus:outline-none focus:ring-2
                        bg-slate-700
                        border-slate-600
                        text-white
                        focus:ring-purple-500/50
                      "
                      onClick={(e) => e.stopPropagation()}
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
              <div className="py-1 max-h-60 overflow-y-auto">
                {renderOptions()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {(error || helperText) && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            text-sm mt-2 transition-colors duration-200
            ${error ? 'text-red-500' : 'text-slate-400'}
          `}
        >
          {error || helperText}
        </motion.p>
      )}
    </div>
  );
};

export default Select;
