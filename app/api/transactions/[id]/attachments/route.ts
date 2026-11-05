import {
  listTransactionAttachments,
  uploadTransactionAttachment,
} from "@/app/lib/transactions/attachments";

export const GET = listTransactionAttachments;
export const POST = uploadTransactionAttachment;
