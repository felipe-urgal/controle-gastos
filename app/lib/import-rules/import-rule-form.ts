import type {
  ImportRuleDescriptionOperator,
  ImportRuleInput,
  ImportRuleModel,
  ImportRuleTransactionType,
} from "@/app/types/import-rule";

export interface ImportRuleFormState {
  name: string;
  isActive: boolean;
  priority: string;
  accountId: string;
  transactionType: ImportRuleTransactionType;
  descriptionOperator: ImportRuleDescriptionOperator;
  descriptionPattern: string;
  minAmountCents: string;
  maxAmountCents: string;
  categoryId: string;
  normalizedDescription: string;
}

export function emptyImportRuleForm(priority = 0): ImportRuleFormState {
  return {
    name: "",
    isActive: true,
    priority: String(priority),
    accountId: "",
    transactionType: "EXPENSE",
    descriptionOperator: "CONTAINS",
    descriptionPattern: "",
    minAmountCents: "",
    maxAmountCents: "",
    categoryId: "",
    normalizedDescription: "",
  };
}

export function importRuleToFormState(
  rule: ImportRuleModel,
): ImportRuleFormState {
  return {
    name: rule.name,
    isActive: rule.isActive,
    priority: String(rule.priority),
    accountId: rule.accountId ?? "",
    transactionType: rule.transactionType,
    descriptionOperator: rule.descriptionOperator,
    descriptionPattern: rule.descriptionPattern,
    minAmountCents:
      rule.minAmountCents === null ? "" : String(rule.minAmountCents),
    maxAmountCents:
      rule.maxAmountCents === null ? "" : String(rule.maxAmountCents),
    categoryId: rule.categoryId,
    normalizedDescription: rule.normalizedDescription ?? "",
  };
}

function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} é obrigatório`);
  return normalized;
}

function integerValue(
  value: string,
  label: string,
  options: { nullable?: boolean; nonnegative?: boolean } = {},
) {
  const normalized = value.trim();
  if (!normalized && options.nullable) return null;
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error(`${label} deve ser um número inteiro`);
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} está fora do intervalo suportado`);
  }
  if (options.nonnegative && parsed < 0) {
    throw new Error(`${label} não pode ser negativo`);
  }
  return parsed;
}

export function importRuleFormToInput(
  form: ImportRuleFormState,
): ImportRuleInput {
  const minAmountCents = integerValue(form.minAmountCents, "Valor mínimo", {
    nullable: true,
    nonnegative: true,
  });
  const maxAmountCents = integerValue(form.maxAmountCents, "Valor máximo", {
    nullable: true,
    nonnegative: true,
  });

  if (
    minAmountCents !== null &&
    maxAmountCents !== null &&
    minAmountCents > maxAmountCents
  ) {
    throw new Error("Valor máximo deve ser maior ou igual ao mínimo");
  }

  return {
    name: requiredText(form.name, "Nome"),
    isActive: form.isActive,
    priority: integerValue(form.priority, "Prioridade") as number,
    accountId: form.accountId || null,
    transactionType: form.transactionType,
    descriptionOperator: form.descriptionOperator,
    descriptionPattern: requiredText(
      form.descriptionPattern,
      "Padrão da descrição",
    ),
    minAmountCents,
    maxAmountCents,
    categoryId: requiredText(form.categoryId, "Categoria"),
    normalizedDescription: form.normalizedDescription.trim() || null,
  };
}

export function importRuleModelToInput(
  rule: ImportRuleModel,
  patch: Partial<ImportRuleInput> = {},
): ImportRuleInput {
  return {
    name: rule.name,
    isActive: rule.isActive,
    priority: rule.priority,
    accountId: rule.accountId,
    transactionType: rule.transactionType,
    descriptionOperator: rule.descriptionOperator,
    descriptionPattern: rule.descriptionPattern,
    minAmountCents: rule.minAmountCents,
    maxAmountCents: rule.maxAmountCents,
    categoryId: rule.categoryId,
    normalizedDescription: rule.normalizedDescription,
    ...patch,
  };
}
