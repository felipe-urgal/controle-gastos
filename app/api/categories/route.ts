import { categoryCrud } from "@/app/lib/categories/category-crud";

export const GET = categoryCrud.list;
export const POST = categoryCrud.create;
