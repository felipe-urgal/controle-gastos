import { merchantCrud } from "@/app/lib/merchants/merchant-crud";

export const GET = merchantCrud.getById;
export const PUT = merchantCrud.update;
export const DELETE = merchantCrud.remove;
