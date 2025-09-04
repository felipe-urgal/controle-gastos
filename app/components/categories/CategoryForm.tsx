"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Input, Loading } from "@/app/components";
import { FaTag } from 'react-icons/fa';

interface CategoryFormProps {
  category?: any;
  isEdit?: boolean;
  onSubmit: (data: { name: string }) => Promise<void>;
}

export interface CategoryFormRef {
  submitForm: () => Promise<void>;
}

const CategoryForm = forwardRef<CategoryFormRef, CategoryFormProps>(({ 
  category, 
  isEdit = false, 
  onSubmit,
}, ref) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState({ name: '' });
  const [form, setForm] = useState({ name: "" });

  useEffect(() => {
    setIsLoading(true);
    
    if (isEdit && category) {
      setForm({ name: category.name });
    }
    
    setIsLoading(false);
  }, [isEdit, category]);

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

  useImperativeHandle(ref, () => ({
    submitForm: async () => {
      if (!validateForm()) return;
      await onSubmit(form);
    }
  }));

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="space-y-4">
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
    </div>
  )
});

CategoryForm.displayName = 'CategoryForm';

export default CategoryForm;