// app/components/categories/FormPreview.tsx
'use client';

import { IconRenderer } from '@/app/components';
import { useThemeColors } from '@/app/hook/useThemeColors';

interface FormPreviewProps {
  formData: any;
  compact?: boolean;
}

export default function FormPreview({ formData, compact = false }: FormPreviewProps) {
  const colors = useThemeColors();

  if (compact) {
    return (
      <div className={`p-4 rounded-xl border border-l-0 ${colors.border.primary} ${colors.bg.secondary} transition-all`}>
        <div className={`p-3 rounded-lg border border-l-0 ${
          formData.isActive 
            ? formData.type === 'INCOME' 
              ? colors.colors.income.border 
              : colors.colors.expense.border
            : colors.border.primary
        } ${colors.state.hover} transition-all relative`}>
          
          <div 
            className="absolute top-0 left-0 w-2 h-full rounded-l-lg"
            style={{ backgroundColor: formData.color }}
          />

          <div className="flex items-center gap-3 ml-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm"
              style={{ backgroundColor: formData.color }}
            >
              <IconRenderer 
                iconName={formData.icon} 
                size={14}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold truncate ${colors.text.primary}`}>
                  {formData.name || 'Nome da Categoria'}
                </span>
                {!formData.isActive && (
                  <span className="text-xs px-2 py-1 bg-gray-500 text-white rounded-full">
                    Inativa
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  formData.type === 'INCOME' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {formData.type === 'INCOME' ? '💰 Receita' : '💸 Despesa'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border ${colors.border.primary} ${colors.bg.secondary} transition-all`}>
      <h3 className={`text-sm font-semibold mb-3 ${colors.text.secondary} flex items-center gap-2`}>
        <span>👁️</span>
        Pré-visualização
      </h3>
      
      <div className={`p-4 rounded-lg border ${
        formData.isActive 
          ? formData.type === 'INCOME' 
            ? colors.colors.income.border 
            : colors.colors.expense.border
          : colors.border.primary
      } ${colors.state.hover} transition-all relative`}>
        
        <div 
          className="absolute top-0 left-0 w-1 h-full rounded-l-lg"
          style={{ backgroundColor: formData.color }}
        />

        <div className="flex items-center justify-between ml-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md"
              style={{ backgroundColor: formData.color }}
            >
              <IconRenderer 
                iconName={formData.icon} 
                size={16}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold truncate ${colors.text.primary}`}>
                  {formData.name || 'Nome da Categoria'}
                </span>
                {!formData.isActive && (
                  <span className="text-xs px-2 py-1 bg-gray-500 text-white rounded-full">
                    Inativa
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  formData.type === 'INCOME' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {formData.type === 'INCOME' ? '💰 Receita' : '💸 Despesa'}
                </span>
                {formData.description && (
                  <span className={`text-xs truncate ${colors.text.tertiary}`}>
                    {formData.description}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Informações da pré-visualização */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className={`p-3 rounded-lg ${colors.bg.tertiary}`}>
          <span className={colors.text.tertiary}>Cor:</span>
          <div className="flex items-center gap-2 mt-2">
            <div 
              className="w-6 h-6 rounded border shadow-sm"
              style={{ backgroundColor: formData.color }}
            />
            <span className={`font-mono ${colors.text.secondary}`}>{formData.color}</span>
          </div>
        </div>
        
        <div className={`p-3 rounded-lg ${colors.bg.tertiary}`}>
          <span className={colors.text.tertiary}>Ícone:</span>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <IconRenderer 
                iconName={formData.icon} 
                size={10}
                className={colors.text.secondary}
              />
            </div>
            <span className={`font-medium capitalize ${colors.text.secondary}`}>
              {formData.icon.replace('-', ' ')}
            </span>
          </div>
        </div>
        
        <div className={`p-3 rounded-lg ${colors.bg.tertiary} col-span-2`}>
          <span className={colors.text.tertiary}>Status:</span>
          <div className="mt-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              formData.isActive 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {formData.isActive ? '✅ Ativa e visível' : '❌ Inativa e oculta'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
