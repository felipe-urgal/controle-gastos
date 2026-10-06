import { createBaseService } from '@/app/services/base-service';
import type {
  TransactionTemplateDTO,
  TransactionTemplateListResponse,
} from '@/app/types/transaction-template';

export const transactionTemplateService = createBaseService<
  TransactionTemplateDTO,
  TransactionTemplateListResponse
>('transaction-templates');
