import { transactionTemplateCrud } from '@/app/lib/templates/transaction-template-crud';
export const GET = transactionTemplateCrud.getById;
export const PUT = transactionTemplateCrud.update;
export const DELETE = transactionTemplateCrud.remove;
