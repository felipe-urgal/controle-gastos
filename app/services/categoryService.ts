import { createBaseService } from "@/app/services/base-service";
import { CategoryModel } from "@/app/types/category";

export const categoryService =
  createBaseService<CategoryModel>("categories");