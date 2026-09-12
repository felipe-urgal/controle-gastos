import { z } from "zod";

/**
 * Enum seguro para evitar string solta
 */
export const categoryTypeEnum = z.enum(["EXPENSE", "INCOME"]);

/**
 * Regex para cor HEX (#RRGGBB)
 */
const hexColorRegex = /^#[0-9A-F]{6}$/i;

/**
 * CREATE
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Nome da categoria é obrigatório" })
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres" })
    .max(50, { message: "Nome não pode exceder 50 caracteres" }),

  color: z
    .string()
    .regex(hexColorRegex, "Formato de cor inválido (#RRGGBB)")
    .optional()
    .default("#3B82F6"),

  icon: z
    .string()
    .min(1, "Ícone inválido")
    .optional()
    .default("tag"),

  type: categoryTypeEnum.default("EXPENSE"),

  isActive: z.boolean().optional().default(true),

  description: z
    .string()
    .trim()
    .max(255, "Descrição muito longa")
    .nullable(),

  position: z
    .number()
    .int("Posição deve ser um número inteiro")
    .min(0, "Posição não pode ser negativa")
    .optional()
    .default(0),
});

/**
 * UPDATE
 * Tudo opcional, mas se vier precisa ser válido
 */
export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(50, "Nome não pode exceder 50 caracteres")
      .optional(),

    color: z
      .string()
      .regex(hexColorRegex, "Formato de cor inválido (#RRGGBB)")
      .optional(),

    icon: z
      .string()
      .min(1, "Ícone inválido")
      .optional(),

    type: categoryTypeEnum.optional(),

    isActive: z.boolean().optional(),

    description: z
      .string()
      .trim()
      .max(255, "Descrição muito longa")
      .optional(),

    position: z
      .number()
      .int("Posição deve ser um número inteiro")
      .min(0, "Posição não pode ser negativa")
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "Nenhum dado fornecido para atualização"
  );

/**
 * Tipos inferidos (forte tipagem)
 */
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
