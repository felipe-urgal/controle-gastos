import { transactionCrud } from "@/app/lib/crud/transaction.crud";

export const GET = transactionCrud.getById;
export const PUT = transactionCrud.update;
export const DELETE = transactionCrud.remove;
