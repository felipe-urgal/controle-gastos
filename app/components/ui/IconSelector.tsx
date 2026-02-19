// app/components/ui/IconSelector.tsx
'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  FaSearch, 
  FaCheck, 
  FaThLarge,  // ← Substitui FaGrid2
  FaList,
  FaUndo      // ← Para o botão de reset
} from 'react-icons/fa';
import { useThemeColors } from '@/app/hook';
import IconRenderer, { useIcons, ICON_MAP } from './IconRenderer';
import { Button } from '@/app/components'; // ← Importar Button

interface IconSelectorProps {
  value: string;
  onChange: (icon: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

type ViewMode = 'grid' | 'list';

export default function IconSelector({
  value,
  onChange,
  disabled = false,
  className = '',
  label = 'Ícone da conta'
}: IconSelectorProps) {
  const colors = useThemeColors();
  const { getIconsByCategory, getIconLabel, searchIcons } = useIcons();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const categories = [
    { id: 'all', label: 'Todos', icon: '📋' },
    { id: 'finance', label: 'Finanças', icon: '💰' },
    { id: 'account', label: 'Contas', icon: '🏦' },
    { id: 'expense', label: 'Despesas', icon: '💸' },
    { id: 'income', label: 'Receitas', icon: '📈' },
    { id: 'action', label: 'Ações', icon: '⚡' },
  ];

  const getFilteredIcons = () => {
    if (searchTerm) {
      return searchIcons(searchTerm).map(item => item.key);
    }

    if (selectedCategory === 'all') {
      return Object.keys(ICON_MAP);
    }

    return getIconsByCategory(selectedCategory);
  };

  const icons = getFilteredIcons();

  // Paginação ou agrupamento por categoria
  const groupedIcons = useMemo(() => {
    if (viewMode === 'list') {
      const groups: Record<string, string[]> = {};
      
      icons.forEach(iconKey => {
        const category = ICON_MAP[iconKey]?.category || 'other';
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(iconKey);
      });
      
      return groups;
    }
    return null;
  }, [icons, viewMode]);

  const getCategoryLabel = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat ? `${cat.icon} ${cat.label}` : category;
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Header com label, busca e view mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className={`text-sm font-medium ${colors.text.secondary}`}>
          {label}
        </label>
        
        <div className="flex items-center gap-2">
          {/* Busca */}
          <div className="relative flex-1 sm:w-48">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ícone..."
              className={`
                w-full pl-9 pr-3 py-1.5 text-sm rounded-lg
                border ${colors.border.primary}
                ${colors.bg.secondary} ${colors.text.primary}
                focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500
              `}
            />
          </div>

          {/* Toggle view mode */}
          <div className="flex bg-slate-800/60 border border-slate-700 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`
                p-1.5 rounded-md transition-all
                ${viewMode === 'grid' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-slate-400 hover:text-white'
                }
              `}
              title="Visualização em grade"
            >
              <FaThLarge size={14} /> {/* ← Agora usando FaThLarge */}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`
                p-1.5 rounded-md transition-all
                ${viewMode === 'list' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-slate-400 hover:text-white'
                }
              `}
              title="Visualização em lista"
            >
              <FaList size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Categorias */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setSelectedCategory(cat.id);
              setSearchTerm('');
            }}
            className={`
              px-3 py-1.5 text-xs rounded-lg transition-all
              flex items-center gap-1.5
              ${selectedCategory === cat.id
                ? 'bg-purple-600 text-white shadow-lg'
                : `${colors.bg.tertiary} ${colors.text.tertiary} hover:${colors.bg.secondary}`
              }
            `}
          >
            <span>{cat.icon}</span>
            <span className="hidden sm:inline">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Contador de resultados */}
      <div className="text-xs text-slate-400">
        {icons.length} {icons.length === 1 ? 'ícone encontrado' : 'ícones encontrados'}
      </div>

      {/* Grid/Lista de ícones */}
      <div className={`
        border rounded-xl ${colors.border.primary} ${colors.bg.secondary}
        max-h-80 overflow-y-auto p-3
        scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800
      `}>
        {icons.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            <div className="text-4xl mb-3">🔍</div>
            <p>Nenhum ícone encontrado</p>
            <p className="text-xs mt-1">Tente buscar por outro termo</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Visualização em Grade */
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {icons.map((iconKey) => (
              <motion.button
                key={iconKey}
                type="button"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onChange(iconKey)}
                disabled={disabled}
                className={`
                  relative group
                  aspect-square rounded-xl
                  flex flex-col items-center justify-center
                  transition-all duration-200
                  p-2
                  ${value === iconKey
                    ? 'bg-purple-600 text-white ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900'
                    : `${colors.bg.tertiary} ${colors.text.tertiary} hover:${colors.bg.primary} hover:text-purple-400`
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={getIconLabel(iconKey)}
              >
                <IconRenderer iconName={iconKey} size={24} />
                
                {/* Tooltip no hover */}
                <span className="
                  absolute -bottom-8 left-1/2 -translate-x-1/2
                  text-xs bg-slate-800 text-white px-2 py-1 rounded
                  opacity-0 group-hover:opacity-100 transition-opacity
                  whitespace-nowrap pointer-events-none z-10
                ">
                  {getIconLabel(iconKey)}
                </span>

                {/* Badge de selecionado */}
                {value === iconKey && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full border-2 border-slate-900 flex items-center justify-center"
                  >
                    <FaCheck size={10} className="text-white" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        ) : (
          /* Visualização em Lista */
          <div className="space-y-4">
            {Object.entries(groupedIcons || {}).map(([category, categoryIcons]) => (
              <div key={category} className="space-y-2">
                {/* Título da categoria */}
                <h4 className="text-xs font-medium text-slate-400 sticky top-0 bg-slate-800/90 backdrop-blur-sm py-2 px-1">
                  {getCategoryLabel(category)}
                </h4>
                
                {/* Ícones da categoria em linha */}
                <div className="flex flex-wrap gap-2">
                  {categoryIcons.map((iconKey) => (
                    <motion.button
                      key={iconKey}
                      type="button"
                      whileHover={{ scale: 1.05, x: 2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onChange(iconKey)}
                      disabled={disabled}
                      className={`
                        relative group
                        flex items-center gap-2
                        px-3 py-2 rounded-lg
                        transition-all duration-200
                        ${value === iconKey
                          ? 'bg-purple-600 text-white'
                          : `${colors.bg.tertiary} ${colors.text.tertiary} hover:${colors.bg.primary} hover:text-purple-400`
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      title={getIconLabel(iconKey)}
                    >
                      <IconRenderer iconName={iconKey} size={18} />
                      <span className="text-sm">{getIconLabel(iconKey)}</span>
                      
                      {value === iconKey && (
                        <FaCheck size={12} className="ml-1" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ícone selecionado - Preview */}
      {value && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30"
        >
          <div className="w-14 h-14 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg">
            <IconRenderer iconName={value} size={28} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Ícone selecionado</p>
            <p className="text-base text-purple-400">{getIconLabel(value)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('wallet')}
            icon={<FaUndo size={12} />}
            className="text-xs"
          >
            Reset
          </Button>
        </motion.div>
      )}
    </div>
  );
}
