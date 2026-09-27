import { z } from "zod";

export const payCreditCardStatementSchema = z.object({
  sourceAccountId: z.string().uuid("Conta pagadora inválida"),
  statementClosingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fechamento inválido"),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de pagamento inválida"),
});

export type PayCreditCardStatementInput = z.infer<typeof payCreditCardStatementSchema>;
