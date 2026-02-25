import { categoryCrud } from "@/app/lib/crud/category.crud";

export const GET = categoryCrud.getById;
export const PUT = categoryCrud.update;
export const DELETE = categoryCrud.remove;
