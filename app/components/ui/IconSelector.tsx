'use client';

// importing hooks
import { useState, useMemo } from 'react';

// importing icons
import { FaSearch, FaCheck, FaThLarge, FaList } from 'react-icons/fa';

// importing components
import IconRenderer, { useIcons, ICON_MAP } from './IconRenderer';

interface IconSelectorProps {
  value: string;
  onChange: (icon: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

type ViewMode = 'grid' | 'list';

export default function IconSelector({
  value,
  onChange,
  disabled = false,
  className = '',
  label = 'Ícone da conta'
}: IconSelectorProps) {
  const { getIconsByCategory, getIconLabel, searchIcons } = useIcons();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'finance', label: 'Finanças' },
    { id: 'account', label: 'Contas' },
    { id: 'expense', label: 'Despesas' },
    { id: 'income', label: 'Receitas' },
    { id: 'action', label: 'Ações' },
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
    return cat ? `${cat.label}` : category;
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-300">
          {label}
        </label>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ícone..."
              className={`
                w-full pl-9 pr-3 py-1.5 text-sm rounded-lg
                border border-gray-700
                bg-gray-800 text-gray-100
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
                : 'bg-gray-700 text-gray-400 hover:bg-gray-800'
              }
            `}
          >
            <span className="hidden sm:inline">{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="text-xs text-slate-400">
        {icons.length} {icons.length === 1 ? 'ícone encontrado' : 'ícones encontrados'}
      </div>

      <div className={`
        border rounded-xl border-gray-700 bg-gray-800
        max-h-80 overflow-y-auto p-3
        scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800
      `}>
        {icons.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <div className="text-xl mb-3">🔍</div>
            <p>Nenhum ícone encontrado</p>
            <p className="text-xs mt-1">Tente buscar por outro termo</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {icons.map((iconKey) => (
              <button
                key={iconKey}
                type="button"
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
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-900 hover:text-purple-400'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={getIconLabel(iconKey)}
              >
                <IconRenderer iconName={iconKey} size={24} />
                
                <span className="
                  absolute -bottom-8 left-1/2 -translate-x-1/2
                  text-xs bg-slate-800 text-white px-2 py-1 rounded
                  opacity-0 group-hover:opacity-100 transition-opacity
                  whitespace-nowrap pointer-events-none z-10
                ">
                  {getIconLabel(iconKey)}
                </span>

                {value === iconKey && (
                  <div
                    className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full border-2 border-slate-900 flex items-center justify-center"
                  >
                    <FaCheck size={10} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          /* Visualização em Lista */
          <div className="space-y-4">
            {Object.entries(groupedIcons || {}).map(([category, categoryIcons]) => (
              <div key={category} className="space-y-2">
                {/* Título da categoria */}
                <h4 className="text-xs font-medium text-slate-400 sticky top-0 bg-slate-800/90 backdrop-blur-sm py-2 px-1 z-999">
                  {getCategoryLabel(category)}
                </h4>
                
                {/* Ícones da categoria em linha */}
                <div className="flex flex-wrap gap-2">
                  {categoryIcons.map((iconKey) => (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => onChange(iconKey)}
                      disabled={disabled}
                      className={`
                        relative group
                        flex items-center gap-2
                        px-3 py-2 rounded-lg
                        transition-all duration-200
                        ${value === iconKey
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-900 hover:text-purple-400'
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
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
