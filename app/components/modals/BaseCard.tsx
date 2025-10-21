// app/components/cards/BaseCard.tsx
'use client';

import { ReactNode } from 'react';

import { Button } from '@/app/components';

import { useThemeColors } from '@/app/hook';

import { FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';

interface BaseCardProps {
  // Dados principais
  title: string;
  subtitle?: string;
  description?: string;
  color?: string;
  icon?: string;
  iconRenderer: (iconName: string, size: number) => ReactNode;
  
  // Status e tipo
  isActive: boolean;
  type?: string;
  typeLabels?: { [key: string]: string };
  
  // Ações
  onEdit?: () => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
  
  // Estados
  loading?: boolean;
  isDeleting?: boolean;
  isToggling?: boolean;
  
  // Configurações
  clickable?: boolean;
  compact?: boolean;
  showBalance?: boolean;
  balance?: number;
  balanceFormatter?: (amount: number) => string;
}

export default function BaseCard({
  // Dados principais
  title,
  subtitle,
  description,
  color = '#3B82F6',
  icon = 'tag',
  iconRenderer,
  
  // Status e tipo
  isActive,
  type,
  typeLabels = {},
  
  // Ações
  onEdit,
  onToggleActive,
  onDelete,
  
  // Estados
  loading,
  isDeleting,
  isToggling,
  
  // Configurações
  clickable = true,
  compact = false,
  showBalance = false,
  balance = 0,
  balanceFormatter
}: BaseCardProps) {
  const colors = useThemeColors();

  const handleClick = () => {
    if (clickable && onEdit) {
      onEdit();
    }
  };

  const getTypeStyle = () => {
    if (!type) return '';
    
    const baseStyle = 'text-xs px-2 py-1 rounded-full';
    
    switch (type) {
      case 'INCOME':
        return `${baseStyle} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300`;
      case 'EXPENSE':
        return `${baseStyle} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300`;
      case 'CREDIT_DEBIT':
        return `${baseStyle} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300`;
      case 'INVESTMENT':
        return `${baseStyle} bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300`;
      default:
        return `${baseStyle} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300`;
    }
  };

  const getBorderColor = () => {
    if (!isActive) return 'border-l-gray-400';
    
    switch (type) {
      case 'INCOME':
        return 'border-l-green-500';
      case 'EXPENSE':
        return 'border-l-red-500';
      case 'CREDIT_DEBIT':
        return 'border-l-blue-500';
      case 'INVESTMENT':
        return 'border-l-purple-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const getBackgroundColor = () => {
    if (!isActive) return 'bg-gray-100 dark:bg-gray-800';
    
    switch (type) {
      case 'INCOME':
        return 'bg-green-50 dark:bg-green-900/10';
      case 'EXPENSE':
        return 'bg-red-50 dark:bg-red-900/10';
      case 'CREDIT_DEBIT':
        return 'bg-blue-50 dark:bg-blue-900/10';
      case 'INVESTMENT':
        return 'bg-purple-50 dark:bg-purple-900/10';
      default:
        return 'bg-blue-50 dark:bg-blue-900/10';
    }
  };

  const getBackgroundWithOpacity = (color: string, opacity: number = 0.1) => {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };

  // Versão compacta
  if (compact) {
    return (
      <div 
        className={`
          p-3 rounded-xl border-l-4 transition-all relative
          ${clickable ? 'cursor-pointer active:scale-95' : ''}
          ${getBorderColor()} ${getBackgroundColor()}
          ${colors.state.hover}
        `}
        style={{ 
          borderColor: color,
          backgroundColor: getBackgroundWithOpacity(color, 0.1)
        }}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
              style={{ backgroundColor: color }}
            >
              {iconRenderer(icon, 14)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold truncate ${colors.text.primary}`}>
                  {title}
                </span>
                {!isActive && (
                  <span className="text-xs px-2 py-1 bg-gray-500 text-white rounded-full flex-shrink-0">
                    Inativa
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                {type && (
                  <span className={getTypeStyle()}>
                    {typeLabels[type] || type}
                  </span>
                )}
                {subtitle && (
                  <span className={`text-xs ${colors.text.tertiary}`}>
                    {subtitle}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lado direito - Saldo e Ações */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {showBalance && balanceFormatter && (
              <span className={`text-sm font-semibold ${
                balance >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {balanceFormatter(balance)}
              </span>
            )}
            
            {/* Ações */}
            {(onToggleActive || onDelete) && (
              <div className="flex items-center gap-1">
                {onToggleActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onToggleActive(); 
                    }}
                    disabled={isToggling}
                    icon={isActive ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    className="!p-2"
                    title={isActive ? 'Desativar' : 'Ativar'}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Versão completa
  return (
    <div 
      className={`
        p-4 rounded-2xl border-l-4 transition-all relative
        ${clickable ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${getBorderColor()} ${getBackgroundColor()}
        ${colors.state.hover} shadow-sm hover:shadow-md
      `}
      style={{ 
        borderColor: color,
        backgroundColor: getBackgroundWithOpacity(color, 0.1)
      }}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Ícone */}
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg"
            style={{ backgroundColor: color }}
          >
            {iconRenderer(icon, 16)}
          </div>
          
          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <span className={`font-bold text-lg truncate ${colors.text.primary}`}>
                {title}
              </span>
              
              <div className="flex flex-wrap gap-2">
                {/* Badge de tipo */}
                {type && (
                  <span className={getTypeStyle()}>
                    {typeLabels[type] || type}
                  </span>
                )}

                {/* Badge de status */}
                {!isActive && (
                  <span className="text-xs px-3 py-1.5 bg-gray-500 text-white rounded-full font-medium">
                    Inativa
                  </span>
                )}
              </div>
            </div>

            {/* Descrição */}
            {description && (
              <p className={`text-sm leading-relaxed ${colors.text.secondary} line-clamp-2`}>
                {description}
              </p>
            )}
          </div>
        </div>
        
        {/* Lado direito - Saldo e Ações (Desktop) */}
        <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-3 flex-shrink-0">
          {/* Saldo */}
          {showBalance && balanceFormatter && (
            <span className={`text-lg font-bold ${
              balance >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {balanceFormatter(balance)}
            </span>
          )}

          {/* Ações */}
          {(onToggleActive || onDelete) && (
            <div className="flex items-center gap-1">
              {onToggleActive && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onToggleActive(); 
                  }}
                  disabled={isToggling}
                  icon={isActive ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  className={`
                    !p-2 sm:!p-3 transition-all
                    ${isActive 
                      ? 'text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30' 
                      : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                    }
                  `}
                  title={isActive ? 'Desativar' : 'Ativar'}
                />
              )}
              
              {onDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onDelete(); 
                  }}
                  disabled={isDeleting}
                  icon={<FaTrash size={14} />}
                  className="!p-2 sm:!p-3 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                  title="Excluir"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Saldo Mobile */}
      {showBalance && balanceFormatter && (
        <div className="sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className={`text-base font-semibold ${
            balance >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {balanceFormatter(balance)}
          </span>
        </div>
      )}

      {/* Ações Mobile */}
      {(onToggleActive || onDelete) && (
        <div className="sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Toque para editar</span>
          </div>
          
          <div className="flex items-center gap-2">
            {onToggleActive && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onToggleActive(); 
                }}
                disabled={isToggling}
                icon={isActive ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                className="!p-2 text-xs"
                title={isActive ? 'Desativar' : 'Ativar'}
              >
                {isActive ? 'Desativar' : 'Ativar'}
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onDelete(); 
                }}
                disabled={isDeleting}
                icon={<FaTrash size={12} />}
                className="!p-2 text-xs"
                title="Excluir"
              >
                Excluir
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Efeito de loading */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 rounded-2xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}