// app/components/CategoriesModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaPlus, FaTrash, FaTags, FaArrowLeft } from 'react-icons/fa';
import { categoryService } from '@/app/services/categoryService';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import { CategoryModel } from '@/app/types/category';
import { Button, Input } from '@/app/components';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoriesModal({ isOpen, onClose }: CategoriesModalProps) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryModel | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    userId: user?.id || ''
  });

  // Sistema de cores baseado no tema
  const getThemeColors = () => {
    return isDark 
      ? {
          // Backgrounds
          bg: {
            primary: 'bg-gray-900',
            secondary: 'bg-gray-800',
            tertiary: 'bg-gray-700',
            modal: 'bg-gray-900',
            overlay: 'bg-black/80',
          },
          // Text
          text: {
            primary: 'text-gray-100',
            secondary: 'text-gray-300',
            tertiary: 'text-gray-400',
            inverse: 'text-gray-900',
          },
          // Borders
          border: {
            primary: 'border-gray-700',
            secondary: 'border-gray-600',
            accent: 'border-blue-500',
          },
          // Estados
          state: {
            hover: 'hover:bg-gray-800',
            active: 'bg-gray-700',
            disabled: 'bg-gray-800 text-gray-500',
          },
          // Cores específicas
          colors: {
            success: {
              bg: 'bg-green-900/20',
              border: 'border-green-800',
              text: 'text-green-300',
            },
            error: {
              bg: 'bg-red-900/20',
              border: 'border-red-800',
              text: 'text-red-300',
            },
            warning: {
              bg: 'bg-yellow-900/20',
              border: 'border-yellow-800',
              text: 'text-yellow-300',
            },
            info: {
              bg: 'bg-blue-900/20',
              border: 'border-blue-800',
              text: 'text-blue-300',
            },
          }
        }
      : {
          // Backgrounds
          bg: {
            primary: 'bg-white',
            secondary: 'bg-gray-50',
            tertiary: 'bg-gray-100',
            modal: 'bg-white',
            overlay: 'bg-black/50',
          },
          // Text
          text: {
            primary: 'text-gray-900',
            secondary: 'text-gray-600',
            tertiary: 'text-gray-500',
            inverse: 'text-white',
          },
          // Borders
          border: {
            primary: 'border-gray-200',
            secondary: 'border-gray-300',
            accent: 'border-blue-500',
          },
          // Estados
          state: {
            hover: 'hover:bg-gray-50',
            active: 'bg-gray-100',
            disabled: 'bg-gray-100 text-gray-400',
          },
          // Cores específicas
          colors: {
            success: {
              bg: 'bg-green-50',
              border: 'border-green-200',
              text: 'text-green-700',
            },
            error: {
              bg: 'bg-red-50',
              border: 'border-red-200',
              text: 'text-red-700',
            },
            warning: {
              bg: 'bg-yellow-50',
              border: 'border-yellow-200',
              text: 'text-yellow-700',
            },
            info: {
              bg: 'bg-blue-50',
              border: 'border-blue-200',
              text: 'text-blue-700',
            },
          }
        };
  };

  const colors = getThemeColors();

  const loadCategories = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await categoryService.getCategories(user.id, { limit: '50' });
      setCategories(response.data?.items || []);
    } catch (err) {
      setError('Erro ao carregar categorias');
      console.error('Erro ao carregar categorias:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Função para prevenir scroll do body
  const preventBodyScroll = useCallback(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    return scrollY;
  }, []);

  // Função para restaurar scroll do body
  const restoreBodyScroll = useCallback((scrollY: number) => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollY);
  }, []);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadCategories();
      setFormData(prev => ({ ...prev, userId: user.id }));
      // Resetar estado do formulário quando o modal abrir
      setShowForm(false);
      setIsEditing(false);
      setCurrentCategory(null);

      // Prevenir scroll apenas em mobile
      if (window.innerWidth <= 768) {
        const scrollY = preventBodyScroll();
        return () => {
          restoreBodyScroll(scrollY);
        };
      }
    }
  }, [isOpen, user?.id, loadCategories, preventBodyScroll, restoreBodyScroll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const categoryData = {
        name: formData.name,
        userId: user.id,
      };

      if (isEditing && currentCategory) {
        // Editar categoria existente
        const updatedCategory = await categoryService.updateCategory({
          ...currentCategory,
          ...categoryData
        });
        setCategories(categories.map(cat => 
          cat.id === currentCategory.id ? updatedCategory : cat
        ));
        setSuccess('Categoria atualizada com sucesso!');
      } else {
        // Criar nova categoria
        const newCategory = await categoryService.createCategory(categoryData);
        setCategories([...categories, newCategory]);
        setSuccess('Categoria criada com sucesso!');
      }
      resetForm();
      loadCategories();
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao salvar categoria';
      setError(errorMessage);
      console.error('Erro ao salvar categoria:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
    setIsEditing(false);
    setCurrentCategory(null);
  };

  const handleEdit = (category: CategoryModel) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      userId: category.userId
    });
    setIsEditing(true);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    setLoading(true);
    try {
      const result = await categoryService.deleteCategory(id);
      if (result.success) {
        setCategories(categories.filter(category => category.id !== id));
        setSuccess('Categoria excluída com sucesso!');
      } else {
        setError(result.message || 'Erro ao excluir categoria');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao excluir categoria';
      setError(errorMessage);
      console.error('Erro ao excluir categoria:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      userId: user?.id || ''
    });
    setIsEditing(false);
    setCurrentCategory(null);
    setShowForm(false);
    setError(null);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleBackToList = () => {
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${colors.bg.overlay} flex items-center justify-center z-50 px-2 py-3 animate-fade-in`}>
      <div className={`${colors.bg.modal} rounded-3xl shadow-xl w-full h-full sm:max-w-6xl sm:max-h-[90vh] sm:mx-4 overflow-hidden flex flex-col animate-slide-up`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.border.primary} flex-shrink-0`}>
          <div className="flex items-center gap-3">
            {showForm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                disabled={submitting}
                icon={<FaArrowLeft />}
                className="!p-2"
                title="Voltar para lista"
              />
            )}
            <FaTags className="text-blue-500" size={20} />
            <h2 className={`text-xl font-bold ${colors.text.primary}`}>
              {showForm 
                ? (isEditing ? 'Editar Categoria' : 'Nova Categoria')
                : 'Gerenciar Categorias'
              }
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            icon={<FaTimes />}
            className="!p-2"
          />
        </div>

        {/* Mensagens de status */}
        {(error || success) && (
          <div className={`mx-6 mt-4 p-3 rounded-lg border ${
            error ? `${colors.colors.error.bg} ${colors.colors.error.border}` : `${colors.colors.success.bg} ${colors.colors.success.border}`
          } flex-shrink-0`}>
            <p className={`text-sm ${
              error ? colors.colors.error.text : colors.colors.success.text
            }`}>
              {error || success}
            </p>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showForm ? (
            /* Formulário */
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <Input
                    label="Nome da Categoria"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Alimentação, Transporte, Salário..."
                    required
                    disabled={submitting}
                    variant="outlined"
                    size="md"
                    autoFocus
                  />
                </div>
              </div>

              <div className={`p-6 border-t ${colors.border.primary} flex-shrink-0`}>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    isLoading={submitting}
                    icon={<FaPlus size={14} />}
                    disabled={submitting}
                  >
                    {isEditing ? 'Atualizar' : 'Adicionar'} Categoria
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleBackToList}
                    disabled={submitting}
                    fullWidth
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            /* Lista de Categorias */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Botão Adicionar */}
              <div className={`p-6 border-b ${colors.border.primary} flex-shrink-0`}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAddNew}
                  icon={<FaPlus size={14} />}
                  fullWidth
                >
                  Adicionar Nova Categoria
                </Button>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className={`mt-2 ${colors.text.tertiary}`}>Carregando categorias...</p>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <FaTags className="text-gray-400 text-4xl mb-4" />
                    <p className={`text-center ${colors.text.tertiary} mb-4`}>
                      Nenhuma categoria cadastrada
                    </p>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleAddNew}
                      icon={<FaPlus size={14} />}
                    >
                      Adicionar Primeira Categoria
                    </Button>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {categories.map((category) => (
                        <div 
                          key={category.id} 
                          className={`p-3 rounded-lg border ${colors.border.primary} ${colors.state.hover} transition-colors cursor-pointer`}
                          onClick={() => handleEdit(category)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`font-medium ${colors.text.primary}`}>
                                {category.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleDelete(category.id); 
                                }}
                                disabled={loading}
                                icon={<FaTrash size={12} />}
                                className="!p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                                title="Excluir categoria"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
