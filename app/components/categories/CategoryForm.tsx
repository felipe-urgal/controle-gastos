"use client";

// Hooks
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import { toast } from 'react-toastify';
import { FormContainer, Input, Loading } from "@/app/components";

// Service
import { categoryService } from "@/app/services/categoryService";

// Types
import { CategoryModel } from '@/app/types/category'

// Icons
import { FaTag } from 'react-icons/fa';

interface CategoryFormProps {
  category?: { id?: string; name: string; };
  isEdit?: boolean;
}

const CategoryForm = ({ category, isEdit = false }: CategoryFormProps) => {
  const { user } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState({ name: '' });

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
      newErrors.name = 'Nome da categoria é obrigatório';
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

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="">
      <div className="">
        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <FormContainer
              isSubmitting={isSubmitting}
              isEdit={isEdit}
              handleSubmit={handleSubmit}
              onCancel={handleCancel}
            >
              <Input
                label="Nome da Categoria"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: Alimentação, Transporte, Lazer, etc."
                loading={isLoading}
                error={errors.name}
                required
                icon={<FaTag className="text-slate-500" />}
              />
            </FormContainer>
          </div>
        </div>
      </div>
    </div>
  )
};

export default CategoryForm;