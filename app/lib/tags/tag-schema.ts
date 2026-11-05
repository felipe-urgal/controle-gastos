import { z } from "zod";

import { normalizeTagDisplayName } from "@/app/lib/tags/tag-name";

export const MAX_TRANSACTION_TAGS = 10;

export const tagNameSchema = z
  .string()
  .transform(normalizeTagDisplayName)
  .pipe(
    z
      .string()
      .min(1, "Nome da tag é obrigatório")
      .max(40, "Nome da tag não pode exceder 40 caracteres"),
  );

const budgetFields = {
  budgetAmount: z
    .number()
    .int("O orçamento deve usar centavos inteiros")
    .positive("O orçamento deve ser maior que zero")
    .max(2_147_483_647, "O orçamento excede o limite suportado")
    .nullable()
    .optional(),
  budgetCurrency: z.enum(["BRL", "USD", "EUR"]).nullable().optional(),
};

/** Valor e moeda do orçamento andam juntos: os dois preenchidos ou os dois nulos. */
function budgetPairIsConsistent(data: { budgetAmount?: number | null; budgetCurrency?: string | null }) {
  const hasAmount = data.budgetAmount !== undefined;
  const hasCurrency = data.budgetCurrency !== undefined;
  if (!hasAmount && !hasCurrency) return true;
  return hasAmount && hasCurrency && (data.budgetAmount === null) === (data.budgetCurrency === null);
}
const BUDGET_PAIR_MESSAGE = "Informe valor e moeda do orçamento juntos (ou deixe os dois vazios)";

export const createTagSchema = z
  .object({
    name: tagNameSchema,
    ...budgetFields,
  })
  .strict()
  .refine(budgetPairIsConsistent, BUDGET_PAIR_MESSAGE);

export const updateTagSchema = z
  .object({
    name: tagNameSchema.optional(),
    isActive: z.boolean().optional(),
    ...budgetFields,
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Nenhum dado fornecido para atualização",
  )
  .refine(budgetPairIsConsistent, BUDGET_PAIR_MESSAGE);
