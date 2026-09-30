import { tagCrud } from "@/app/lib/tags/tag-crud";

export const GET = tagCrud.getById;
export const PUT = tagCrud.update;
export const DELETE = tagCrud.remove;
