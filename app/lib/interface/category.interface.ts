import { CategoryModel } from '@/app/types/category';

export interface CategoryCardProps {
  category: CategoryModel;
  viewMode: "grid" | "list";
  searchTerm?: string;
};

export interface ViewProps {
  category: CategoryModel;
  searchTerm?: string;
};

export interface CategoryInfoProps {
  category: any;
  isDeleting: boolean;
};

export interface CategoryFormProps {
  category?: CategoryModel | null;
  isEditing: boolean;
};
