"use client";

// importing hooks
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

// importing icons
import { FaInfoCircle } from "react-icons/fa";

// importing services
import { categoryService } from "@/app/services/category-service";

// importing types
import { CategoryType } from "@/app/types/category";

// importing components
import { Input, RadioGroup, ColorIconSelector,ActiveToggle } from "@/app/components/ui";
import { FormActions, FormContainer } from "@/app/components/forms";

// importing interface
import { CategoryFormProps } from "@/app/lib/interface/category.interface";

// importing constants
import { categoryTypeOptions, initialFormData } from "@/app/lib/constants/category.constants";

export default function CategoryForm({ category, isEditing }: CategoryFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState(initialFormData);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && category) {
      setFormData({
        name: category.name ?? "",
        type: category.type,
        color: category.color ?? "#3B82F6",
        icon: category.icon ?? "tag",
        description: category.description ?? "",
        isActive: category.isActive,
      });
    } else {
      setFormData(initialFormData);
    }
  }, [category, isEditing]);

  function handleRedirect() {
    if (isEditing && category?.id) {
      router.replace(`/categorias/show/${category.id}`);
    } else {
      router.replace("/categorias");
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        ...formData,
        description: formData.description || null,
      };

      if (isEditing && category) {
        await categoryService.update(category.id, payload);
      } else {
        await categoryService.create(payload);
      }

      handleRedirect();

    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.error?.message ||
        err?.message;

      setSubmitError(apiMessage || "Erro ao salvar categoria");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = isSubmitting;

  return (
    <FormContainer
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-4"
    > 
      <div className="grid grid-cols-1 lg:grid-cols-[0.4fr_2.4fr] gap-3 mb-3">
        <RadioGroup
          required
          label="Tipo de Categoria"
          name="type"
          value={formData.type}
          onChange={(value) =>
            setFormData({ ...formData, type: value as CategoryType })
          }
          options={categoryTypeOptions}
          disabled={loading}
        />

        <Input
          label="Nome da Categoria"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={loading}
          required
          icon={<FaInfoCircle />}
        />
      </div>

      <ColorIconSelector
        color={formData.color}
        icon={formData.icon}
        onColorChange={(color) => setFormData({ ...formData, color })}
        onIconChange={(icon) => setFormData({ ...formData, icon })}
        disabled={loading}
      />

      <Input
        label="Descrição"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        disabled={loading}
        multiline
        rows={3}
      />

      {isEditing && (
        <ActiveToggle
          isActive={formData.isActive}
          onToggle={(isActive) =>
            setFormData({ ...formData, isActive })
          }
          disabled={loading}
          label="Categoria ativa"
        />
      )}

      <FormActions
        isEditing={isEditing}
        loading={loading}
        onCancel={handleRedirect}
        createLabel="Criar Categoria"
        submitLabel="Salvar Alterações"
      />
    </FormContainer>
  );
};
