import { accountCrud } from "@/app/lib/crud/account.crud";

export const GET = accountCrud.list;
export const POST = accountCrud.create;
