'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FaTimes, FaArrowLeft, FaPlus } from 'react-icons/fa';
import { categoryService } from '@/app/services/categoryService';
import { useAuth } from '@/app/context/AuthContext';
import { CategoryModel, CategoryType } from '@/app/types/category';
import { Button, CategoriesList, CategoryForm, CategoriesFilters } from '@/app/components';
import { useThemeColors } from '@/app/hook/useThemeColors';
import { useBodyScrollLock } from '@/app/hook/useBodyScrollLock';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function CategoriesModal({ isOpen, onClose }: CategoriesModalProps) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const { lockScroll, unlockScroll } = useBodyScrollLock();
  
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryModel | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<CategoryType | 'ALL' | null>('ALL');
  const [filterActive, setFilterActive] = useState<ActiveFilter | null>('ALL');

  const filteredCategories = useMemo(() => {
    return categories.filter(category => {
      const typeMatch = filterType === 'ALL' || category.type === filterType;
      const activeMatch = filterActive === 'ALL' || 
        (filterActive === 'ACTIVE' && category.isActive) ||
        (filterActive === 'INACTIVE' && !category.isActive);
      
      return typeMatch && activeMatch;
    });
  }, [categories, filterType, filterActive]);

  const loadCategories = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await categoryService.getCategories(user.id);
      setCategories(response.data?.items || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar categorias';
      setError(errorMessage);
      console.error('Erro ao carregar categorias:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadCategories();
      resetFormState();
      lockScroll();
    }
  }, [isOpen, user?.id, loadCategories, lockScroll]);

  useEffect(() => {
    return () => {
      unlockScroll();
    };
  }, [unlockScroll]);

  const resetFormState = () => {
    setShowForm(false);
    setIsEditing(false);
    setCurrentCategory(null);
    setError(null);
    setSuccess(null);
    setFilterType('ALL');
    setFilterActive('ALL');
  };

  const handleAddNew = () => {
    setShowForm(true);
    setIsEditing(false);
    setCurrentCategory(null);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (category: CategoryModel) => {
    setCurrentCategory(category);
    setIsEditing(true);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleBackToList = () => {
    setShowForm(false);
    setIsEditing(false);
    setCurrentCategory(null);
    setError(null);
    const successTimer = setTimeout(() => setSuccess(null), 2000);
    return () => clearTimeout(successTimer);
  };

  const handleSuccess = (message: string) => {
    setSuccess(message);
    loadCategories();
    handleBackToList();
  };

  const handleCategoryUpdate = (updatedCategories: CategoryModel[]) => {
    setCategories(updatedCategories);
    loadCategories();
  };

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        if (showForm) {
          handleBackToList();
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen, onClose, showForm]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const activeCategoriesCount = categories.filter(cat => cat.isActive).length;

  return (
    <div 
      className={`fixed inset-0 ${colors.bg.overlay} flex items-end sm:items-center justify-center z-50 p-0 animate-fade-in safe-area-container`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="categories-modal-title"
    >
      <div 
        className={`
          ${colors.bg.modal} rounded-t-3xl sm:rounded-3xl shadow-xl w-full h-[95vh]
          sm:max-w-6xl sm:max-h-[90vh] sm:mx-4 overflow-hidden flex flex-col 
          animate-slide-up-mobile sm:animate-slide-up
          modal-fullscreen-mobile
        `}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className={`
          flex items-center justify-between p-4 border-b ${colors.border.primary} 
          flex-shrink-0 sticky top-0 ${colors.bg.modal} z-10
          shadow-sm sm:shadow-none pt-safe
        `}>
          <div className="flex items-center gap-3">
            {/* Botão de voltar no mobile */}
            {!showForm && (
              <button
                onClick={onClose}
                className="sm:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Fechar modal"
              >
                <FaArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div>
              <h2 
                id="categories-modal-title"
                className={`text-lg sm:text-xl font-bold ${colors.text.primary}`}
              >
                {showForm 
                  ? (isEditing ? 'Editar Categoria' : 'Nova Categoria')
                  : 'Gerenciar Categorias'
                }
              </h2>
              {!showForm && (
                <p className={`text-xs sm:text-sm ${colors.text.secondary} mt-1`}>
                  {loading ? 'Carregando...' : (
                    categories.length === 0 
                      ? 'Nenhuma categoria encontrada'
                      : `${filteredCategories.length} de ${categories.length} categoria${categories.length !== 1 ? 's' : ''}`
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {!showForm && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddNew}
                icon={<FaPlus size={16} />}
                className="!p-2"
                title="Adicionar nova categoria"
                aria-label="Adicionar nova categoria"
              />
            )}
            
            {/* Botão de fechar no desktop */}
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              icon={<FaTimes size={16} />}
              className="!hidden sm:!inline-flex !p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Fechar"
              aria-label="Fechar modal"
            />
          </div>
        </div>

        {/* Mensagens de erro/sucesso */}
        {(error || success) && (
          <div 
            className={`
              mx-4 mt-2 p-3 rounded-xl border flex-shrink-0 animate-fade-in
              ${error 
                ? `${colors.colors.error.bg} ${colors.colors.error.border} ${colors.colors.error.text}`
                : `${colors.colors.success.bg} ${colors.colors.success.border} ${colors.colors.success.text}`
              }
            `}
            role={error ? "alert" : "status"}
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <div 
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  error ? 'bg-red-500' : 'bg-green-500'
                }`} 
                aria-hidden="true"
              />
              <p className="text-sm flex-1">
                {error || success}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                icon={<FaTimes size={12} />}
                className="!p-1 flex-shrink-0"
                title="Fechar mensagem"
                aria-label="Fechar mensagem"
              />
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showForm ? (
            <CategoryForm
              category={currentCategory}
              isEditing={isEditing}
              onSubmitSuccess={handleSuccess}
              onCancel={handleBackToList}
              submitting={submitting}
              setSubmitting={setSubmitting}
            />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Filtros */}
              <div className={`
                p-4 border-b ${colors.border.primary} flex-shrink-0 
                ${colors.bg.secondary}
              `}>
                <CategoriesFilters
                  filterType={filterType}
                  filterActive={filterActive}
                  onFilterTypeChange={setFilterType}
                  onFilterActiveChange={setFilterActive}
                />
              </div>

              {/* Lista de Categorias */}
              <div className="flex-1 overflow-y-auto pb-safe">
                <CategoriesList
                  categories={categories}
                  filteredCategories={filteredCategories}
                  loading={loading}
                  onEdit={handleEdit}
                  onDelete={handleCategoryUpdate}
                  onToggleActive={handleCategoryUpdate}
                  onError={setError}
                  onSuccess={setSuccess}
                  onAdd={handleAddNew}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Mobile */}
        {!showForm && !loading && (
          <div className={`sm:hidden p-4 border-t ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0 pb-safe`}>
            <div className={`flex items-center justify-between text-xs ${colors.text.tertiary}`}>
              <span>Toque em uma categoria para editar</span>
              <span>{activeCategoriesCount} ativa{activeCategoriesCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-up-mobile {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-slide-up-mobile {
          animation: slide-up-mobile 0.3s ease-out;
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s infinite;
        }
      `}</style>
    </div>
  );
}