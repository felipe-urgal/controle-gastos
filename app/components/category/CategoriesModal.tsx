// app/components/CategoriesModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaTags, FaArrowLeft, FaPlus } from 'react-icons/fa';
import { categoryService } from '@/app/services/categoryService';
import { useAuth } from '@/app/context/AuthContext';
import { CategoryModel, CategoryType } from '@/app/types/category';
import { Button, CategoriesList, CategoryForm, CategoriesFilters } from '@/app/components';
import { useThemeColors } from '@/app/hook/useThemeColors';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoriesModal({ isOpen, onClose }: CategoriesModalProps) {
  const { user } = useAuth();
  const colors = useThemeColors();
  
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryModel | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<CategoryType | 'ALL' | null>(null);
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | null>(null);

  const loadCategories = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await categoryService.getCategories(user.id, { limit: '100' });
      setCategories(response.data?.items || []);
    } catch (err) {
      setError('Erro ao carregar categorias');
      console.error('Erro ao carregar categorias:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Funções para prevenir/restaurar scroll
  const preventBodyScroll = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '15px';
    return scrollY;
  }, []);

  const restoreBodyScroll = useCallback((scrollY: number) => {
    if (typeof window === 'undefined') return;
    
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, scrollY);
  }, []);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadCategories();
      setShowForm(false);
      setIsEditing(false);
      setCurrentCategory(null);
      setError(null);
      setSuccess(null);

      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        const scrollY = preventBodyScroll();
        return () => {
          restoreBodyScroll(scrollY);
        };
      }
    }
  }, [isOpen, user?.id, loadCategories, preventBodyScroll, restoreBodyScroll]);

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
    setTimeout(() => setSuccess(null), 2000);
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

  // Fechar modal ao pressionar ESC
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed h-full w-full  ${colors.bg.overlay} flex items-center justify-center z-50 p-0 sm:p-3 animate-fade-in`}
    >
      <div className={`
        ${colors.bg.modal} rounded-none sm:rounded-3xl shadow-xl w-full h-full 
        sm:max-w-6xl sm:max-h-[90vh] sm:mx-4 overflow-hidden flex flex-col 
        animate-slide-up-mobile sm:animate-slide-up
      `}>
        
        {/* Header */}
        <div className={`
          flex items-center justify-between p-4 border-b ${colors.border.primary} 
          flex-shrink-0 sticky top-0 ${colors.bg.modal} z-10
          shadow-sm sm:shadow-none
        `}>
          <div className="flex items-center gap-3">
            {showForm ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                disabled={submitting}
                icon={<FaArrowLeft size={16} />}
                className="!p-2 sm:!p-2"
                title="Voltar para lista"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <FaTags className="text-white" size={16} />
              </div>
            )}
            
            <div>
              <h2 className={`text-lg sm:text-xl font-bold ${colors.text.primary}`}>
                {showForm 
                  ? (isEditing ? 'Editar Categoria' : 'Nova Categoria')
                  : 'Gerenciar Categorias'
                }
              </h2>
              {!showForm && categories.length > 0 && (
                <p className={`text-xs sm:text-sm ${colors.text.secondary} mt-1`}>
                  {categories.length} categoria{categories.length !== 1 ? 's' : ''} encontrada{categories.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="!hidden sm:!inline flex items-center gap-1 sm:gap-2">
            {!showForm && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddNew}
                icon={<FaPlus size={14} />}
                className="!hidden sm:!inline !p-2 sm:!p-2"
                title="Adicionar nova categoria"
              >
              </Button>
            )}
            
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              icon={<FaTimes size={16} />}
              className="!p-2 sm:!p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Fechar"
            />
          </div>
        </div>

        {/* Mensagens de status */}
        {(error || success) && (
          <div className={`
            mx-4 mt-2 p-3 rounded-xl border flex-shrink-0 animate-fade-in
            ${error 
              ? `${colors.colors.error.bg} ${colors.colors.error.border} ${colors.colors.error.text}`
              : `${colors.colors.success.bg} ${colors.colors.success.border} ${colors.colors.success.text}`
            }
          `}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <p className="text-sm flex-1">
                {error || success}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                }}
                icon={<FaTimes size={12} />}
                className="!p-1 flex-shrink-0"
                title="Fechar mensagem"
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
              onError={setError}
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
              <div className="flex-1 overflow-y-auto">
                <CategoriesList
                  categories={categories}
                  filteredCategories={categories.filter(category => {
                    const typeMatch = 
                      !filterType || 
                      filterType === 'ALL' || 
                      category.type === filterType;

                    const activeMatch = 
                      !filterActive ||
                      filterActive === 'ALL' || 
                      (filterActive === 'ACTIVE' && category.isActive) ||
                      (filterActive === 'INACTIVE' && !category.isActive);
                    
                    return typeMatch && activeMatch;
                  })}
                  loading={loading}
                  onEdit={handleEdit}
                  onDelete={handleCategoryUpdate}
                  onToggleActive={handleCategoryUpdate}
                  onError={setError}
                  onSuccess={setSuccess}
                  onAdd={handleAddNew}
                />
              </div>

              {/* Botão Flutuante para Mobile */}
              {!showForm && (
                <>
                  <div className="sm:hidden fixed bottom-13 left-3 z-20">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={onClose}
                      disabled={submitting}
                      icon={<FaArrowLeft size={16} />}
                      className="!p-3 sm:!p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      title="Voltar"
                    />
                  </div>

                  {categories.length > 0 && (
                    <div className="sm:hidden fixed bottom-13 right-3 z-20">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleAddNew}
                        icon={<FaPlus size={16} />}
                        className="!p-3 shadow-lg rounded-full animate-bounce-gentle"
                        title="Adicionar nova categoria"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Info Mobile */}
        {!showForm && (
          <div className={`sm:hidden p-3 border-t ${colors.border.primary} ${colors.bg.secondary} flex-shrink-0`}>
            <div className={`flex items-center justify-between text-xs ${colors.text.tertiary}`}>
              <span>Toque em uma categoria para editar</span>
              <span>{categories.filter(cat => cat.isActive).length} ativas</span>
            </div>
          </div>
        )}
      </div>

      {/* CSS para animações personalizadas */}
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
