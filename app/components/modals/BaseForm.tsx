// app/components/forms/BaseForm.tsx
'use client';

import { ReactNode } from 'react';

import { Button } from '@/app/components';

import { useThemeColors } from '@/app/hook';

interface BaseFormProps {
  // Form state
  submitting: boolean;
  // error?: string | null;
  
  // Actions
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  
  // Content
  children: ReactNode;
  submitButtonText?: string;
  cancelButtonText?: string;
  
  // Configuration
  isEditing?: boolean;
  showActions?: boolean;
}

export default function BaseForm({
  // Form state
  submitting,
  // error,
  
  // Actions
  onSubmit,
  onCancel,
  
  // Content
  children,
  submitButtonText,
  cancelButtonText = 'Cancelar',
  
  // Configuration
  isEditing = false,
  showActions = true
}: BaseFormProps) {
  const colors = useThemeColors();

  const defaultSubmitText = isEditing ? 'Atualizar' : 'Adicionar';

  return (
    <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 sm:p-4 lg:p-6 flex-1 overflow-y-auto">
        {/* Error Message */}
        {/*{error && (
          <div className={`
            mb-4 p-3 rounded-lg border
            ${colors.colors.error.bg} ${colors.colors.error.border} ${colors.colors.error.text}
          `}>
            <p className="text-sm">{error}</p>
          </div>
        )}*/}

        {children}
      </div>

      {/* Form Actions */}
      {showActions && (
        <div className={`p-4 lg:p-6 border-t ${colors.border.primary} flex-shrink-0`}>
          <div className="flex gap-3 w-full max-w-2xl ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1"
            >
              {cancelButtonText}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex-1"
              isLoading={submitting}
              disabled={submitting}
            >
              {submitButtonText || defaultSubmitText}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}