import { z } from "zod";

export const updateTransactionReconciliationSchema = z.object({
  status: z.enum(["UNCLEARED", "CLEARED"]),
});

export type UpdateTransactionReconciliationInput = z.infer<
  typeof updateTransactionReconciliationSchema
>;
