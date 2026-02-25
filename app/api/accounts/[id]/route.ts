import { accountCrud } from "@/app/lib/crud/account.crud";

export const GET = accountCrud.getById;
export const PUT = accountCrud.update;
export const DELETE = accountCrud.remove;
