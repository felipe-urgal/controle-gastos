import { transactionCrud } from "@/app/lib/transactions/transaction-crud";

export const GET = transactionCrud.list;
export const POST = transactionCrud.create;
