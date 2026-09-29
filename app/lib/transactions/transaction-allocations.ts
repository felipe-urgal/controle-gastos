export type TransactionAllocationInput = { categoryId: string; amount: number };

export function validateTransactionAllocationSet(input: {
  amount: number;
  categoryId: string;
  allocations?: TransactionAllocationInput[];
}) {
  const allocations = input.allocations ?? [];
  if (allocations.length === 0) return null;
  if (allocations.length < 2) return "A divisão precisa ter pelo menos duas categorias";
  if (allocations.length > 20) return "Uma transação pode ter no máximo 20 divisões";
  const categoryIds = allocations.map((item) => item.categoryId);
  if (new Set(categoryIds).size !== categoryIds.length) return "Cada categoria pode aparecer apenas uma vez na divisão";
  if (!categoryIds.includes(input.categoryId)) return "A categoria principal deve participar da divisão";
  if (allocations.some((item) => !Number.isInteger(item.amount) || item.amount <= 0)) return "Valores da divisão devem usar centavos inteiros positivos";
  const total = allocations.reduce((sum, item) => sum + item.amount, 0);
  if (!Number.isSafeInteger(total) || total !== input.amount) return "A soma das divisões deve ser igual ao valor da transação";
  return null;
}
