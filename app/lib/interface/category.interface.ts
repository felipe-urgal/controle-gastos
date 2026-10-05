import type { CategoryModel } from '@/app/types/category';

export interface CategoryInfoProps {
  category: CategoryModel;
  isDeleting: boolean;
}

export interface CategoryFormProps {
  category?: CategoryModel | null;
  isEditing: boolean;
}
