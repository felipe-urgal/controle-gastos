import { createBaseService } from '@/app/services/base-service';
import type { TransactionTemplateDTO } from '@/app/types/transaction-template';
export const transactionTemplateService = createBaseService<TransactionTemplateDTO>('transaction-templates');
