import { merchantCrud } from "@/app/lib/merchants/merchant-crud";

export const GET = merchantCrud.list;
export const POST = merchantCrud.create;
