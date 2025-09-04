"use client";

import { useState, useEffect } from "react";
import { FormContainer, Input, Loading } from "@/app/components";
import { FaTag } from 'react-icons/fa';

interface CategoryFormProps {
  category?: { id?: string; name: string; };
  isEdit?: boolean;
  onSubmit: (data: { name: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CategoryForm = ({ 
  category, 
  isEdit = false, 
  onSubmit,
  onCancel,
  isSubmitting = false
}: CategoryFormProps) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit(form);
  };

  if (isLoading) {
    return <Loading />
  }

  return (
    <FormContainer
      isSubmitting={isSubmitting}
      isEdit={isEdit}
      handleSubmit={handleSubmit}
      onCancel={onCancel}
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
  )
};

export default CategoryForm;
