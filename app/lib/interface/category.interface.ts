import { CategoryModel } from '@/app/types/category';

export interface CategoryInfoProps {
  category: any;
  isDeleting: boolean;
};

export interface CategoryFormProps {
  category?: CategoryModel | null;
  isEditing: boolean;
};
