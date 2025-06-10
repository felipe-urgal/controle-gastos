import { Prisma } from '@prisma/client';
import { GetParams } from './params';
import { Pagination } from './components';

// Tipo completo com todas as propriedades (incluindo relações)
export type CategoryModel = Prisma.Category;

export interface CategoryResponse {
  success: true;
  data: {
    items: CategoryModel[];  // Note the singular 'account' as per your error
    total: number;
  };
  pagination: Pagination;
}

export type GetCategoriesParams = GetParams;