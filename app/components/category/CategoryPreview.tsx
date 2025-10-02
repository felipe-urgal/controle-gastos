// app/components/categories/CategoryPreview.tsx
'use client';

import { FaEye, FaEyeSlash, FaTrash, FaEdit } from 'react-icons/fa';
import { CategoryModel } from '@/app/types/category';
import { Button, IconRenderer } from '@/app/components';
import { useThemeColors } from '@/app/hook/useThemeColors';

interface CategoryPreviewProps {
  category: CategoryModel;
  onEdit?: (category: CategoryModel) => void;
  onToggleActive?: (category: CategoryModel) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
  clickable?: boolean;
  compact?: boolean;
}

export default function CategoryPreview({ 
  category, 
  onEdit, 
  onToggleActive, 
  onDelete, 
  loading, 
  clickable = true,
  compact = false
}: CategoryPreviewProps) {
  const handleClick = () => {
    if (clickable && onEdit) {
      onEdit(category);
    }
  };

  const colors = useThemeColors();

  // Versão compacta para listas densas
  if (compact) {
    return (
      <div 
        className={`
          p-3 rounded-xl border-l-4 transition-all relative
          ${clickable ? 'cursor-pointer active:scale-95' : ''}
          ${category.isActive 
            ? category.type === 'INCOME' 
              ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10' 
              : 'border-l-red-500 bg-red-50 dark:bg-red-900/10'
            : 'border-l-gray-400 bg-gray-100 dark:bg-gray-800'
          }
          ${colors.state.hover}
        `}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
              style={{ backgroundColor: category.color || '#3B82F6' }}
            >
              <IconRenderer 
                iconName={category.icon || 'tag'} 
                size={14}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold truncate ${colors.text.primary}`}>
                  {category.name}
                </span>
                {!category.isActive && (
                  <span className="text-xs px-2 py-1 bg-gray-500 text-white rounded-full flex-shrink-0">
                    Inativa
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  category.type === 'INCOME' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {category.type === 'INCOME' ? '💰 Receita' : '💸 Despesa'}
                </span>
              </div>
            </div>
          </div>

          {/* Ações compactas */}
          {onToggleActive && onDelete && (
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onToggleActive(category); 
                }}
                icon={category.isActive ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                className="!p-2"
                title={category.isActive ? 'Desativar' : 'Ativar'}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`
        p-4 rounded-2xl border-l-6 transition-all relative
        ${clickable ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${category.isActive 
          ? category.type === 'INCOME' 
            ? 'border-l-green-500 bg-gradient-to-r from-green-50 to-white dark:from-green-900/10 dark:to-gray-900' 
            : 'border-l-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-900/10 dark:to-gray-900'
          : 'border-l-gray-400 bg-gradient-to-r from-gray-100 to-white dark:from-gray-800 dark:to-gray-900'
        }
        ${colors.state.hover} shadow-sm hover:shadow-md
      `}
      onClick={handleClick}
    >
      {/* Indicador de cor lateral */}
      {/*<div 
        className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
        style={{ backgroundColor: category.color || '#3B82F6' }}
      />*/}

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Ícone com cor */}
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg"
            style={{ backgroundColor: category.color || '#3B82F6' }}
          >
            <IconRenderer 
              iconName={category.icon || 'tag'} 
              size={16}
            />
          </div>
          
          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <span className={`font-bold text-lg truncate ${colors.text.primary}`}>
                {category.name}
              </span>
              
              <div className="flex flex-wrap gap-2">
                {/* Badge de tipo */}
                <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                  category.type === 'INCOME' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {category.type === 'INCOME' ? '💰 Receita' : '💸 Despesa'}
                </span>

                {/* Badge de status */}
                {!category.isActive && (
                  <span className="text-sm px-3 py-1.5 bg-gray-500 text-white rounded-full font-medium">
                    👻 Inativa
                  </span>
                )}
              </div>
            </div>

            {/* Descrição */}
            {category.description && (
              <p className={`text-sm leading-relaxed ${colors.text.secondary} line-clamp-2`}>
                {category.description}
              </p>
            )}

            {/* Metadados */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: category.color || '#3B82F6' }}
                />
                <span className={`text-xs ${colors.text.tertiary}`}>
                  {category.color || '#3B82F6'}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <IconRenderer 
                    iconName={category.icon || 'tag'} 
                    size={8}
                    className="text-gray-600 dark:text-gray-300"
                  />
                </div>
                <span className={`text-xs capitalize ${colors.text.tertiary}`}>
                  {category.icon?.replace('-', ' ') || 'tag'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ações - Layout responsivo */}
        {onToggleActive && onDelete && (
          <div className="hidden sm:flex flex-col sm:flex-row items-center gap-1 flex-shrink-0 ml-2">
            {/* Botão Editar - Visível apenas no hover em desktop */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                onEdit?.(category); 
              }}
              icon={<FaEdit size={14} />}
              className="!p-2 hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity"
              title="Editar categoria"
            />
            
            {/* Botão Ativar/Desativar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                onToggleActive(category); 
              }}
              icon={category.isActive ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              className={`
                !p-2 sm:!p-3 transition-all
                ${category.isActive 
                  ? 'text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30' 
                  : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                }
              `}
              title={category.isActive ? 'Desativar categoria' : 'Ativar categoria'}
            />
            
            {/* Botão Excluir */}
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete(category.id); 
              }}
              disabled={loading}
              icon={<FaTrash size={14} />}
              className="!p-2 sm:!p-3 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
              title="Excluir categoria"
            />
          </div>
        )}
      </div>

      {/* Ações Mobile - Barra inferior */}
      {onToggleActive && onDelete && (
        <div className="sm:hidden flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Toque para editar</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                onToggleActive(category); 
              }}
              icon={category.isActive ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
              className="!p-2 text-xs"
              title={category.isActive ? 'Desativar' : 'Ativar'}
            >
              {category.isActive ? 'Desativar' : 'Ativar'}
            </Button>
            
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete(category.id); 
              }}
              disabled={loading}
              icon={<FaTrash size={12} />}
              className="!p-2 text-xs"
              title="Excluir"
            >
              Excluir
            </Button>
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
