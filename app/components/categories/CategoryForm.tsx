"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";
import { Input } from "../ui/Input";
import { FormContainer } from '../ui/FormContainer';
import { categoryService } from "@/app/services/categoryService";
import { CategoryModel } from '@/app/types/category'

interface CategoryFormProps {
  category?: { id?: string; name: string; };
  isEdit?: boolean;
}

const CategoryForm = ({ category, isEdit = false }: CategoryFormProps) => {
  const { user } = useAuth();
  const router   = useRouter();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading]       = useState<boolean>(true);
  const [errors, setErrors]             = useState({ name: '' });

  const [form, setForm] = useState({ name: "" });

  useEffect(() => {
    if (user?.id) {
      const fetchCategory = async () => {
        try {
          setIsLoading(true);
          
          if (isEdit && category) {
            setForm({ name: category.name });
          }
          
        } catch (error) {
          toast.error((error as Error).message);
          if (isEdit) {
            router.push(`/categorias`);
          }
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchCategory();
    }
  }, [user, isEdit, category, router]);

  const validateForm = () => {
    let valid = true;
    const newErrors = { name: '' };

    if (!form.name.trim()) {
      newErrors.name = 'Nome da conta é obrigatório';
      valid = false;
    } else if (form.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
      valid = false;
    } else if (form.name.trim().length > 50) {
      newErrors.name = 'Nome não pode exceder 50 caracteres';
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    const payload = {
      ...(isEdit && category?.id && { id: category.id }),
      userId: user.id,
      name: form.name.trim(),
    };

    setIsSubmitting(true);

    try {
      if (isEdit) {
        await categoryService.updateCategory(payload as CategoryModel);
        toast.success("Categoria atualizada com sucesso!");
      } else {
        await categoryService.createCategory(payload);
        toast.success("Categoria criada com sucesso!");
      }

      router.push(`/categorias`);
    } catch (error) {
      toast.error((error as Error).message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/categorias');
  };

  return (
    <div className="bg-gray-800 p-3 border-b border-gray-700">
      {isLoading ? (
        <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <FormContainer
          isSubmitting={isSubmitting}
          isEdit={isEdit}
          handleSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel={isEdit ? 'Atualizar' : 'Criar'}
        >
          <div className="col-span-4">
            <Input
              label="Nome da Categoria"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ex: Salário, Mercado, etc."
              loading={isLoading}
              error={errors.name}
              required
            />
          </div>
        </FormContainer>
      )}
    </div>
  )
};

export default CategoryForm;