import { categoryCrud } from "@/app/lib/crud/category.crud";

export const GET = categoryCrud.list;
export const POST = categoryCrud.create;
