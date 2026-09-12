import { categoryCrud } from "@/app/lib/categories/category-crud";

export const GET = categoryCrud.getById;
export const PUT = categoryCrud.update;
export const DELETE = categoryCrud.remove;
