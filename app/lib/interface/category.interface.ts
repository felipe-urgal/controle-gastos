import type { CategoryModel } from '@/app/types/category';

export interface CategoryFormProps {
  category?: CategoryModel | null;
  isEditing: boolean;
}
