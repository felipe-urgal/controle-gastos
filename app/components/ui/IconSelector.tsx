// app/components/ui/IconSelector.tsx
'use client';

import { useState, useMemo } from 'react';
import { useThemeColors } from '@/app/hook/useThemeColors';
import IconRenderer, { useIcons, ICON_GROUPS } from './IconRenderer';
import { FaSearch, FaTimes, FaFilter, FaStar } from 'react-icons/fa';

export default function IconSelector({
  value,
  onChange,
  disabled = false,
  mode = 'full',
  showLabels = true,
  groupFilter = 'all',
  searchable = true,
  className = ''
}: any) {
  const { getIconLabel, getAllIcons, getIconsByGroup, searchIcons } = useIcons();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState(groupFilter);
  const [favorites, setFavorites] = useState<string[]>([]);

  const colors = useThemeColors();

  // Filtrar ícones baseado no grupo ativo e busca
  const filteredIcons = useMemo(() => {
    let icons: string[] = [];

    if (activeGroup === 'all') {
      icons = getAllIcons();
    } else if (activeGroup === 'favorites') {
      icons = favorites;
    } else {
      icons = getIconsByGroup(activeGroup) || [];
    }

    // Aplicar filtro de busca
    if (searchQuery.trim()) {
      icons = searchIcons(searchQuery);
    }

    return icons;
  }, [activeGroup, searchQuery, favorites, getAllIcons, getIconsByGroup, searchIcons]);

  // Alternar favorito
  const toggleFavorite = (iconName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(iconName) 
        ? prev.filter(icon => icon !== iconName)
        : [...prev, iconName]
    );
  };

  // Grupos disponíveis para filtro
  const availableGroups = useMemo(() => {
    const allIcons = getAllIcons();
    const groups = [
      { key: 'all', label: 'Todos', count: allIcons.length },
      { key: 'favorites', label: 'Favoritos', count: favorites.length },
      ...Object.entries(ICON_GROUPS).map(([key, icons]) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        count: (icons as string[]).length
      }))
    ];
    return groups;
  }, [getAllIcons, favorites]);

  // Renderização compacta (para modais pequenos)
  if (mode === 'compact') {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Grid de ícones */}
        <div className={`border rounded-xl ${colors.border.primary} ${colors.bg.secondary}`}>
          <div className="grid grid-cols-10 gap-2 max-h-30 overflow-y-auto px-3 py-2">
            {filteredIcons.slice(0, 30).map((icon: string) => (
              <button
                key={icon}
                type="button"
                className={`
                  group relative transition-all duration-200 flex flex-col items-center
                  ${value === icon 
                    ? `${colors.border.accent}` 
                    : `${colors.border.primary}`
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => onChange(icon)}
                disabled={disabled}
                title={getIconLabel(icon)}
              >
                <div className={`
                  rounded-full flex items-center justify-center transition-colors
                  ${value === icon 
                    ? colors.colors.info.text
                    : colors.text.tertiary
                  }
                `}>
                  <IconRenderer 
                    iconName={icon} 
                    className="w-5 h-5"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Renderização completa
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header com busca e filtros */}
      <div className="space-y-3">
        {/* Barra de busca */}
        {searchable && (
          <div className="relative">
            <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${colors.text.tertiary}`} size={14} />
            <input
              type="text"
              placeholder="Buscar ícones..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className={`
                w-full pl-10 pr-10 py-2.5 border rounded-xl transition-colors
                ${colors.border.primary} ${colors.bg.secondary} ${colors.text.primary}
                placeholder:${colors.text.tertiary}
                focus:outline-none focus:${colors.border.accent} focus:ring-2 focus:ring-blue-500/20
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              disabled={disabled}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${colors.text.tertiary} hover:${colors.text.secondary} transition-colors`}
              >
                <FaTimes size={14} />
              </button>
            )}
          </div>
        )}

        {/* Filtros por grupo */}
        <div className="flex flex-wrap gap-2">
          {availableGroups.map((group) => (
            <button
              key={group.key}
              onClick={() => setActiveGroup(group.key)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5
                ${activeGroup === group.key
                  ? `${colors.border.accent} bg-blue-500 text-white shadow-sm`
                  : `${colors.border.primary} ${colors.bg.secondary} ${colors.text.secondary} ${colors.state.hover}`
                }
                ${group.count === 0 ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              disabled={group.count === 0}
            >
              {group.key === 'favorites' && <FaStar size={10} />}
              {group.key === 'all' && <FaFilter size={10} />}
              {group.label}
              <span className={`
                px-1.5 py-0.5 rounded-full text-[10px] min-w-[20px] text-center
                ${activeGroup === group.key
                  ? 'bg-white/20 text-white'
                  : `${colors.bg.tertiary} ${colors.text.tertiary}`
                }
              `}>
                {group.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid de ícones */}
      <div className={`border rounded-xl ${colors.border.primary} ${colors.bg.secondary}`}>
        <div className="p-3">
          {filteredIcons.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaSearch className={colors.text.tertiary} />
              </div>
              <p className={colors.text.secondary}>Nenhum ícone encontrado</p>
              <p className={`text-sm ${colors.text.tertiary} mt-1`}>
                Tente alterar os filtros ou termos da busca
              </p>
            </div>
          ) : (
            <div className={`
              grid gap-2 overflow-y-auto
              ${mode === 'grid' 
                ? 'grid-cols-8 max-h-64' 
                : 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 max-h-80'
              }
            `}>
              {filteredIcons.map((icon: string) => (
                <button
                  key={icon}
                  type="button"
                  className={`
                    group relative p-2 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1
                    min-h-[70px] sm:min-h-[75px] active:scale-95
                    ${value === icon 
                      ? `${colors.border.accent} bg-blue-50 dark:bg-blue-900/30 shadow-sm scale-105 ring-2 ring-blue-200 dark:ring-blue-800` 
                      : `${colors.border.primary} ${colors.state.hover} bg-white dark:bg-gray-800 hover:shadow-md`
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  onClick={() => onChange(icon)}
                  disabled={disabled}
                  title={getIconLabel(icon)}
                >
                  {/* Botão de favorito */}
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent) => toggleFavorite(icon, e)}
                    className={`
                      absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center 
                      text-xs transition-all opacity-0 group-hover:opacity-100 focus:opacity-100
                      ${favorites.includes(icon)
                        ? 'text-yellow-500 opacity-100'
                        : `${colors.text.tertiary} hover:text-yellow-500`
                      }
                    `}
                    title={favorites.includes(icon) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <FaStar 
                      size={10} 
                      className={favorites.includes(icon) ? 'fill-current' : ''}
                    />
                  </button>

                  {/* Ícone */}
                  <div className={`
                    w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors mt-1
                    ${value === icon 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                    }
                  `}>
                    <IconRenderer 
                      iconName={icon} 
                      className={`
                        w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform
                        ${value === icon ? 'scale-110' : 'group-hover:scale-105'}
                      `}
                    />
                  </div>

                  {/* Label */}
                  {showLabels && (
                    <span className={`
                      text-[10px] xs:text-xs font-medium truncate w-full text-center px-1
                      transition-colors
                      ${value === icon 
                        ? 'text-blue-600 dark:text-blue-400 font-semibold' 
                        : `${colors.text.tertiary} group-hover:text-gray-700 dark:group-hover:text-gray-300`
                      }
                    `}>
                      {getIconLabel(icon)}
                    </span>
                  )}

                  {/* Indicador de seleção */}
                  {value === icon && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview do ícone selecionado */}
      {value && (
        <div className={`
          p-4 rounded-xl border-2 ${colors.border.accent} bg-blue-50 dark:bg-blue-900/20
          flex items-center gap-4 transition-all
        `}>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
            <IconRenderer 
              iconName={value} 
              className="w-6 h-6"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-sm font-semibold ${colors.text.primary} block`}>
              Ícone Selecionado
            </span>
            <span className={`text-sm ${colors.text.secondary} capitalize`}>
              {getIconLabel(value)}
            </span>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 flex-shrink-0`}>
            Selecionado
          </div>
        </div>
      )}

      {/* Dica Mobile */}
      <div className="sm:hidden flex items-center justify-center gap-2 p-2">
        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
        <span className={`text-xs ${colors.text.tertiary} text-center`}>
          Deslize para ver mais ícones
        </span>
      </div>
    </div>
  );
}
