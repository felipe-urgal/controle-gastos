import { z } from "zod";

const currencySchema = z.enum(["BRL", "USD", "EUR"]);
const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).optional();

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }, "Data inválida");

export const createDebtSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da dívida").max(100),
  currency: currencySchema,
  balance: z.number().int().positive("O saldo devedor deve ser maior que zero"),
  installmentAmount: z.number().int().positive().nullable().optional(),
  dueDate: z.union([isoDateSchema, z.null()]).optional(),
  remainingInstallments: z.number().int().min(1).max(1200).nullable().optional(),
  institution: optionalText(120),
  description: optionalText(500),
});

export const updateDebtSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  installmentAmount: z.number().int().positive().nullable().optional(),
  dueDate: z.union([isoDateSchema, z.null()]).optional(),
  remainingInstallments: z.number().int().min(1).max(1200).nullable().optional(),
  institution: optionalText(120),
  description: optionalText(500),
  status: z.literal("ARCHIVED").optional(),
});

export const adjustDebtSchema = z.object({
  newBalance: z.number().int().min(0, "O saldo não pode ser negativo"),
  description: optionalText(255),
});
