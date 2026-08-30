"use client";

import { useEffect, useState } from "react";

import { NewPage } from "@/app/components/base-pages";
import { TransactionForm } from "@/app/components/pages/transactions";
import { transactionService } from "@/app/services/transaction-service";
import { getDuplicateTransactionValues } from "@/app/lib/transactions/transaction-quick-actions";
import { FormData } from "@/app/lib/interface/transaction.interface";

interface NewProps {
  duplicateId?: string;
}

export default function New({ duplicateId }: NewProps) {
  const [initialValues, setInitialValues] = useState<FormData>();
  const [loadingDuplicate, setLoadingDuplicate] = useState(Boolean(duplicateId));
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  useEffect(() => {
    if (!duplicateId) return;

    const sourceId = duplicateId;
    let cancelled = false;

    async function loadDuplicateSource() {
      setLoadingDuplicate(true);
      setDuplicateError(null);

      try {
        const response = await transactionService.getById(sourceId);

        if (!cancelled) {
          setInitialValues(getDuplicateTransactionValues(response.data));
        }
      } catch (error) {
        if (!cancelled) {
          setDuplicateError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a transação para duplicação"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingDuplicate(false);
        }
      }
    }

    loadDuplicateSource();

    return () => {
      cancelled = true;
    };
  }, [duplicateId]);

  return (
    <NewPage backUrl="/transacoes">
      {loadingDuplicate ? (
        <div role="status" className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Carregando dados da transação...
        </div>
      ) : duplicateError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
        >
          {duplicateError}
        </div>
      ) : (
        <TransactionForm isEditing={false} initialValues={initialValues} />
      )}
    </NewPage>
  );
}
