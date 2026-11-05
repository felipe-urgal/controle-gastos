import {
  deleteTransactionAttachment,
  downloadTransactionAttachment,
} from "@/app/lib/transactions/attachments";

export const GET = downloadTransactionAttachment;
export const DELETE = deleteTransactionAttachment;
