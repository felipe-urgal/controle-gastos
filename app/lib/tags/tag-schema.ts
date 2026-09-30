import { z } from "zod";

export const MAX_TRANSACTION_TAGS = 10;

export const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Nome da tag é obrigatório")
  .max(40, "Nome da tag não pode exceder 40 caracteres");

export const createTagSchema = z.object({
  name: tagNameSchema,
});

export const updateTagSchema = createTagSchema.partial();
