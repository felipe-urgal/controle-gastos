type TransactionPresentationInput = {
  kind?: string | null;
  transferRole?: string | null;
  account?: { name?: string | null } | null;
  category?: { name?: string | null } | null;
  counterpartAccount?: { name?: string | null } | null;
};

export function isTransferTransaction(transaction: TransactionPresentationInput) {
  return transaction.kind === 'TRANSFER';
}

export function getTransferDirectionLabel(transaction: TransactionPresentationInput) {
  if (!isTransferTransaction(transaction)) return null;
  if (transaction.transferRole === 'SOURCE') return 'Transferência enviada';
  if (transaction.transferRole === 'DESTINATION') return 'Transferência recebida';
  return 'Transferência';
}

export function getTransferCounterpartLabel(transaction: TransactionPresentationInput) {
  if (!isTransferTransaction(transaction)) return null;

  const counterpartName = transaction.counterpartAccount?.name?.trim() || 'Contraparte indisponível';
  if (transaction.transferRole === 'SOURCE') return `Para ${counterpartName}`;
  if (transaction.transferRole === 'DESTINATION') return `De ${counterpartName}`;
  return `Com ${counterpartName}`;
}

export function getTransactionContextLabel(transaction: TransactionPresentationInput) {
  const accountName = transaction.account?.name?.trim() || 'Sem conta';

  if (isTransferTransaction(transaction)) {
    return `${getTransferCounterpartLabel(transaction)} · ${accountName}`;
  }

  return `${transaction.category?.name?.trim() || 'Sem categoria'} · ${accountName}`;
}
