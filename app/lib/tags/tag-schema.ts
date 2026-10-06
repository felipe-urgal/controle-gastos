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

export const createTagSchema = z
  .object({
    name: tagNameSchema,
  })
  .strict();

export const updateTagSchema = z
  .object({
    name: tagNameSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Nenhum dado fornecido para atualização",
  );
