'use client';

import { ModalShell } from '@/app/components/overlays/modal-shell';
import { ManualImportRuleCreator } from '@/app/components/pages/transactions/import/manual-rule-creator';
import { Button, Input, Select } from '@/app/components/ui';
import { CategoryModel } from '@/app/types/category';
import { MerchantDTO } from '@/app/types/merchant';
import { MerchantAliasOperator } from '@/app/types/merchant-alias';
import { EditablePreviewItem, InboxState, formatAmount, getInboxState, getReviewReasons, stateClass, stateLabel } from '@/app/components/pages/transactions/import/import-helpers';

export function InboxMetric({ label, value, state }: { label: string; value: number; state: InboxState }) {
  return (
    <div className={`min-w-24 rounded-[var(--radius-md)] border px-3 py-2 ${stateClass(state)}`}>
      <span className="block text-xs font-semibold uppercase tracking-wide">{label}</span>
      <strong className="mt-0.5 block text-lg">{value}</strong>
    </div>
  );
}

export function ImportDetail({
  item,
  accountId,
  categories,
  merchants,
  merchantOptionsUnavailable,
  merchantRetrying,
  onRetryMerchants,
  merchantSearch,
  merchantSearchLoading,
  onSearchMerchants,
  accountCurrency,
  showValues,
  submitting,
  onUpdate,
  headingIdPrefix = 'import-detail',
}: {
  item: EditablePreviewItem;
  accountId: string;
  categories: CategoryModel[];
  merchants: MerchantDTO[];
  merchantOptionsUnavailable: boolean;
  merchantRetrying: boolean;
  onRetryMerchants: () => void;
  merchantSearch: string;
  merchantSearchLoading: boolean;
  onSearchMerchants: (query: string) => void;
  accountCurrency?: string;
  showValues: boolean;
  submitting: boolean;
  headingIdPrefix?: string;
  onUpdate: (
    index: number,
    patch: Partial<Pick<EditablePreviewItem, 'selected' | 'categoryId' | 'merchantId' | 'merchantReviewed' | 'learnMerchantAlias' | 'merchantAliasOperator' | 'ignored'>>,
  ) => void;
}) {
  const state = getInboxState(item);
  const availableCategories = categories.filter((category) => category.type === item.type);
  const selectedCategory = item.categoryId
    ? availableCategories.find((category) => category.id === item.categoryId)
    : undefined;
  const suggestedMerchantOutsideOptions =
    Boolean(item.merchantId) &&
    item.merchantId === item.suggestedMerchantId &&
    !merchants.some((merchant) => merchant.id === item.merchantId);
  const canCategorize = !item.duplicate && item.errors.length === 0 && !item.ignored;
  const reviewReasons = getReviewReasons(item);

  const headingId = `${headingIdPrefix}-${item.index}`;

  return (
    <aside className="ds-panel p-5" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">Linha {item.index + 1}</p>
          <h3 id={headingId} className="mt-1 break-words font-semibold text-[var(--foreground)]">
            {item.description || 'Descrição ausente'}
          </h3>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClass(state)}`}>
          {stateLabel(state)}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div>
          <dt className="text-[var(--text-muted)]">Data</dt>
          <dd className="mt-0.5 text-[var(--foreground)]">{item.date || 'Inválida'}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Valor</dt>
          <dd className={`mt-0.5 font-semibold ${item.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
            {item.type === 'INCOME' ? '+' : '-'}{formatAmount(item.amountCents, item.currency ?? accountCurrency, showValues)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Origem</dt>
          <dd className="mt-0.5 text-[var(--foreground)]">{item.source}{item.externalId ? ` · ${item.externalId}` : ''}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Regra</dt>
          <dd className="mt-0.5 break-words text-[var(--foreground)]">
            {item.importRuleConflict
              ? `Conflito: ${(item.matchingRuleNames ?? []).join(', ') || 'múltiplas regras'}`
              : item.matchedRuleName ?? 'Nenhuma sugestão'}
            {(item.alsoMatchingRuleNames?.length ?? 0) > 0 && (
              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                Também corresponderam: {item.alsoMatchingRuleNames?.join(', ')}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Estabelecimento</dt>
          <dd className="mt-0.5 break-words text-[var(--foreground)]">
            {item.merchantAliasConflict ? (
              <>
                <span>Conflito entre aliases — nenhum será aplicado</span>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  Busque abaixo qualquer estabelecimento ativo para resolver.
                </span>
              </>
            ) : (
              item.suggestedMerchantName ?? 'Nenhum alias reconhecido'
            )}
          </dd>
        </div>
      </dl>

      {reviewReasons.length > 0 && !item.duplicate && !item.ignored && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-sm">
          <p className="font-medium text-[var(--foreground)]">Por que precisa de revisão</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--text-muted)]">
            {reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      )}

      {item.errors.length > 0 && (
        <div role="alert" className="mt-4 rounded-[var(--radius-md)] border border-[var(--danger)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
          {item.errors.join(' ')}
        </div>
      )}

      {item.duplicate && (
        <p className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
          Este item já possui a mesma identidade de importação e fica fora da seleção.
        </p>
      )}

      <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-4">
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Categoria
          <div className="mt-2">
            <Select
              ariaLabel="Categoria"
              value={item.categoryId ?? ''}
              onChange={(value) => onUpdate(item.index, { categoryId: String(value) || null })}
              disabled={!canCategorize || submitting}
              placeholder="Selecione"
              options={availableCategories.map((category) => ({ value: category.id, label: category.name }))}
            />
          </div>
        </label>

        {canCategorize && (
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Estabelecimento
            {merchantOptionsUnavailable && (
              <span
                className="mt-2 block rounded-[var(--radius-md)] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-2 text-xs font-normal leading-relaxed text-[var(--text-muted)]"
                role="status"
              >
                Lista de estabelecimentos indisponível. Você pode continuar sem estabelecimento; sugestões já reconhecidas no preview podem ser mantidas.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={onRetryMerchants}
                  isLoading={merchantRetrying}
                  loadingText="Recarregando…"
                >
                  Tentar carregar estabelecimentos
                </Button>
              </span>
            )}
            <div className="mt-2">
              <Input
                type="search"
                aria-label="Buscar estabelecimento"
                value={merchantSearch}
                onChange={(event) => onSearchMerchants(event.target.value)}
                disabled={submitting || merchantOptionsUnavailable}
                placeholder="Buscar por nome"
              />
            </div>
            {merchantSearchLoading && (
              <span className="mt-1 block text-xs font-normal text-[var(--text-muted)]" role="status">
                Buscando estabelecimentos…
              </span>
            )}
            <div className="mt-2">
              <Select
                ariaLabel="Estabelecimento"
                value={item.merchantId ?? ''}
                onChange={(value) => onUpdate(item.index, {
                  merchantId: String(value) || null,
                  merchantReviewed: true,
                  learnMerchantAlias: false,
                })}
                disabled={submitting || merchantOptionsUnavailable}
                placeholder="Sem estabelecimento"
                options={[
                  ...(suggestedMerchantOutsideOptions && item.merchantId
                    ? [{ value: item.merchantId, label: item.suggestedMerchantName ?? 'Estabelecimento sugerido' }]
                    : []),
                  ...merchants.map((merchant) => ({ value: merchant.id, label: merchant.name })),
                ]}
              />
            </div>
            {(!item.merchantReviewed || merchantOptionsUnavailable) && (
              <Button
                variant="link"
                size="sm"
                className="mt-2"
                onClick={() =>
                  onUpdate(item.index, {
                    merchantId: null,
                    merchantReviewed: true,
                    learnMerchantAlias: false,
                  })
                }
              >
                Continuar sem estabelecimento
              </Button>
            )}

            {item.merchantReviewed && item.merchantId ? (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={item.learnMerchantAlias}
                    disabled={submitting}
                    onChange={(event) =>
                      onUpdate(item.index, {
                        learnMerchantAlias: event.target.checked,
                      })
                    }
                  />
                  Aprender esta descrição para próximas importações
                </label>
                {item.learnMerchantAlias ? (
                  <div className="mt-2">
                    <label className="text-xs font-semibold text-[var(--text-muted)]">
                      Regra do reconhecimento
                      <div className="mt-1">
                        <Select
                          ariaLabel="Regra do reconhecimento"
                          value={item.merchantAliasOperator}
                          disabled={submitting}
                          onChange={(value) => onUpdate(item.index, { merchantAliasOperator: value as MerchantAliasOperator })}
                          options={[
                            { value: 'EQUALS', label: 'Igual a' },
                            { value: 'STARTS_WITH', label: 'Começa com' },
                            { value: 'CONTAINS', label: 'Contém' },
                          ]}
                        />
                      </div>
                    </label>
                    <p className="mt-2 break-all text-xs text-[var(--text-muted)]">
                      Padrão: <span className="font-mono">{item.description}</span>
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Se um alias equivalente já apontar para outro estabelecimento,
                      ele será reclassificado atomicamente para esta escolha.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </label>
        )}

        {canCategorize && (
          <ManualImportRuleCreator
            accountId={accountId}
            transactionType={item.type}
            description={item.description}
            categoryId={item.categoryId}
            suggestedCategoryId={item.suggestedCategoryId}
            categoryName={selectedCategory?.name}
            disabled={submitting}
          />
        )}

        {!item.duplicate && item.errors.length === 0 && (
          <label className="flex min-h-11 items-center gap-3 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={item.selected && !item.ignored}
              disabled={submitting}
              onChange={(event) =>
                onUpdate(item.index, {
                  selected: event.target.checked,
                  ignored: !event.target.checked,
                })
              }
            />
            Importar este lançamento
          </label>
        )}

        {item.errors.length > 0 && !item.duplicate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => onUpdate(item.index, { ignored: !item.ignored, selected: false })}
          >
            {item.ignored ? 'Voltar para revisão' : 'Ignorar item inválido'}
          </Button>
        )}
      </div>
    </aside>
  );
}

export function MobileImportDetail({
  item,
  accountId,
  categories,
  merchants,
  merchantOptionsUnavailable,
  merchantRetrying,
  onRetryMerchants,
  merchantSearch,
  merchantSearchLoading,
  onSearchMerchants,
  accountCurrency,
  showValues,
  submitting,
  onUpdate,
  onClose,
}: {
  item: EditablePreviewItem;
  accountId: string;
  categories: CategoryModel[];
  merchants: MerchantDTO[];
  merchantOptionsUnavailable: boolean;
  merchantRetrying: boolean;
  onRetryMerchants: () => void;
  merchantSearch: string;
  merchantSearchLoading: boolean;
  onSearchMerchants: (query: string) => void;
  accountCurrency?: string;
  showValues: boolean;
  submitting: boolean;
  onUpdate: (
    index: number,
    patch: Partial<Pick<EditablePreviewItem, 'selected' | 'categoryId' | 'merchantId' | 'merchantReviewed' | 'learnMerchantAlias' | 'merchantAliasOperator' | 'ignored'>>,
  ) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell
      variant="fullscreen-sheet"
      title="Revisar lançamento"
      closeLabel="Fechar"
      maxWidthClass="max-w-xl"
      onClose={onClose}
    >
    <ImportDetail
      item={item}
      accountId={accountId}
      categories={categories}
      merchants={merchants}
      merchantOptionsUnavailable={merchantOptionsUnavailable}
      merchantRetrying={merchantRetrying}
      onRetryMerchants={onRetryMerchants}
      merchantSearch={merchantSearch}
      merchantSearchLoading={merchantSearchLoading}
      onSearchMerchants={onSearchMerchants}
      accountCurrency={accountCurrency}
      showValues={showValues}
      submitting={submitting}
      onUpdate={onUpdate}
      headingIdPrefix="mobile-import-detail"
    />
    </ModalShell>
  );
}
