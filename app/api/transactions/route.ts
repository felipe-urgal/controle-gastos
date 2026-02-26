import { transactionCrud } from "@/app/lib/crud/transaction.crud";

export const GET = transactionCrud.list;
export const POST = transactionCrud.create;
