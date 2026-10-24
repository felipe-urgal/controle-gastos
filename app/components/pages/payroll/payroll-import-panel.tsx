'use client';

import { FaChevronRight, FaFileImport, FaRedo } from 'react-icons/fa';

import { Metric, typeLabel } from '@/app/components/pages/payroll/payroll-shared';
import { Button, Input, Select } from '@/app/components/ui';
import { payrollMoney, payrollPaymentTypeLabel } from '@/app/lib/payroll/payroll-presentation';
import type {
  PayrollImportPreview,
  PayrollPaymentType,
} from '@/app/types/payroll';

const monthlyPaymentTypes: PayrollPaymentType[] = ['REGULAR', 'THIRTEENTH', 'VACATION', 'PLR', 'OTHER'];

type PayrollRubric = NonNullable<PayrollImportPreview['document']>['earnings'][number];

/** Importação de holerite em painel próprio: escolher o PDF, conferir o que foi lido e confirmar. */
export function PayrollImportPanel({
  preview,
  rubrics,
  paymentType,
  supersedesId,
  working,
  feedback,
  actionError,
  showValues,
  setFile,
  setPreview,
  setPaymentType,
  setSupersedesId,
  file,
  onAnalyze,
  onConfirm,
  onClose,
}: {
  preview: PayrollImportPreview | null;
  rubrics: PayrollRubric[];
  paymentType: PayrollPaymentType;
  supersedesId: string;
  working: boolean;
  feedback: string;
  actionError: string;
  showValues: boolean;
  file: File | null;
  setFile: (file: File | null) => void;
  setPreview: (preview: PayrollImportPreview | null) => void;
  setPaymentType: (type: PayrollPaymentType) => void;
  setSupersedesId: (id: string) => void;
  onAnalyze: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <section aria-labelledby="payroll-import-title" className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="payroll-import-title" className="text-lg font-bold text-[var(--foreground)]">
          Importar documento mensal
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
          Importe folha regular, adiantamento, 13º, férias, PLR ou
          outro rendimento reconhecido. Dados ausentes permanecem
          ausentes.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onClose} disabled={working}>
        Fechar
      </Button>
    </div>

    {feedback && (
      <div
        role="status"
        className="mt-4 rounded-[var(--radius-lg)] bg-[var(--success-subtle)] p-3 text-sm font-semibold text-[var(--success)]"
      >
        {feedback}
      </div>
    )}

    {actionError && (
      <div
        role="alert"
        className="mt-4 rounded-[var(--radius-lg)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
      >
        {actionError}
      </div>
    )}

    {!preview ? (
      <div className="mt-5 space-y-4">
        <Input
          type="file"
          accept=".pdf,application/pdf"
          aria-label="PDF do holerite"
          disabled={working}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Button
          size="lg"
          fullWidth
          disabled={!file || working}
          onClick={() => void onAnalyze()}
          icon={<FaFileImport aria-hidden="true" />}
        >
          {working ? 'Analisando...' : 'Analisar PDF'}
        </Button>
      </div>
    ) : preview.requiresOcr ? (
      <div className="mt-5 space-y-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-4 text-sm text-[var(--foreground)]">
          <strong>OCR/revisão necessária</strong>
          <p className="mt-1 text-[var(--text-muted)]">
            {preview.warnings[0]}
          </p>
        </div>
        <Button
          variant="outline"
          fullWidth
          onClick={() => {
            setPreview(null);
            setSupersedesId('');
          }}
          icon={<FaRedo aria-hidden="true" />}
        >
          Escolher outro PDF
        </Button>
      </div>
    ) : preview.document ? (
      <div className="mt-5 space-y-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--orbit-primary)]">
            Documento detectado
          </span>
          <strong className="mt-1 block text-[var(--foreground)]">
            {typeLabel(preview.document.documentType)}
          </strong>
          <span className="mt-1 block break-words text-xs text-[var(--text-muted)]">
            {String(preview.document.month).padStart(2, '0')}/
            {preview.document.year} · {preview.document.employerName} ·{' '}
            {preview.document.employerCnpj ||
              'CNPJ não reconhecido'}
          </span>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
          <Select
            id="payroll-payment-type"
            label="Classificação do pagamento"
            value={paymentType}
            onChange={(value) =>
              setPaymentType(String(value) as PayrollPaymentType)
            }
            disabled={
              preview.document.documentType === 'PAYROLL_ADVANCE'
            }
            options={(preview.document.documentType ===
            'PAYROLL_ADVANCE'
              ? (['ADVANCE'] as PayrollPaymentType[])
              : monthlyPaymentTypes
            ).map((type) => ({
              value: type,
              label: payrollPaymentTypeLabel(type),
            }))}
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Detectado como{' '}
            <strong>
              {payrollPaymentTypeLabel(
                preview.document.paymentType,
              )}
            </strong>
            . Confirme ou corrija antes de importar.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Metric
            label="Vencimentos"
            value={payrollMoney(
              preview.document.totalEarningsCents,
              showValues,
            )}
          />
          <Metric
            label="Descontos"
            value={payrollMoney(
              preview.document.totalDeductionsCents,
              showValues,
            )}
          />
          <Metric
            label="Líquido"
            value={payrollMoney(
              preview.document.netPaidCents,
              showValues,
            )}
          />
          <Metric
            label="IRRF"
            value={payrollMoney(
              preview.document.irrfCents,
              showValues,
            )}
          />
          <Metric
            label="INSS"
            value={payrollMoney(
              preview.document.inssCents,
              showValues,
            )}
          />
          <Metric label="Rubricas" value={String(rubrics.length)} />
        </div>

        {preview.document.errors.length > 0 && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
            {preview.document.errors.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        )}

        {(preview.warnings.length > 0 ||
          preview.document.warnings.length > 0) && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-xs text-[var(--text-muted)]">
            {[
              ...new Set([
                ...preview.warnings,
                ...preview.document.warnings,
              ]),
            ].map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        )}

        {preview.replacementCandidates.length > 0 &&
          !(
            preview.document.duplicate &&
            paymentType === preview.document.paymentType
          ) && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-sm text-[var(--foreground)]">
              <strong>Retificação / substituição</strong>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Escolha explicitamente a versão ativa substituída. A
                anterior continua no histórico.
              </p>
              <div className="mt-3">
                <Select
                  ariaLabel="Versão substituída"
                  value={supersedesId}
                  onChange={(value) => setSupersedesId(String(value))}
                  placeholder="Importar como documento adicional"
                  options={preview.replacementCandidates.map(
                    (candidate) => ({
                      value: candidate.id,
                      label: `${payrollPaymentTypeLabel(
                        candidate.paymentType,
                      )} · versão de ${new Date(
                        candidate.createdAt,
                      ).toLocaleDateString('pt-BR')} · líquido ${payrollMoney(
                        candidate.netPaidCents,
                        showValues,
                      )}`,
                    }),
                  )}
                />
              </div>
            </div>
          )}

        {preview.document.duplicate &&
          paymentType === preview.document.paymentType && (
            <div className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
              Este documento com esta classificação já foi importado.
            </div>
          )}

        {rubrics.length > 0 && (
          <details className="group rounded-[var(--radius-lg)] border border-[var(--border)]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-lg)] px-4 text-sm font-bold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden">
              <span>Rubricas ({rubrics.length})</span>
              <FaChevronRight
                className="shrink-0 text-xs text-[var(--text-muted)] transition-transform group-open:rotate-90"
                aria-hidden="true"
              />
            </summary>
            <div className="space-y-2 p-3 pt-0">
            <div className="grid gap-2 sm:grid-cols-2">
              {rubrics.map((rubric, index) => (
                <article
                  key={(rubric.code ?? 'rubric') + '-' + index}
                  className="min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <strong className="break-words text-[var(--foreground)]">
                      {rubric.description}
                    </strong>
                    <span className="text-[var(--text-muted)]">
                      {rubric.code ?? 'Sem código'}
                    </span>
                  </div>
                  {rubric.reference && (
                    <p className="mt-1 break-words text-[var(--text-muted)]">
                      Referência: {rubric.reference}
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Metric
                      label="Vencimento"
                      value={payrollMoney(
                        rubric.earningsCents,
                        showValues,
                      )}
                    />
                    <Metric
                      label="Desconto"
                      value={payrollMoney(
                        rubric.deductionsCents,
                        showValues,
                      )}
                    />
                  </div>
                </article>
              ))}
            </div>
            </div>
          </details>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="lg"
            disabled={working}
            onClick={() => {
              setPreview(null);
              setPaymentType('REGULAR');
              setSupersedesId('');
            }}
          >
            Voltar
          </Button>
          <Button
            size="lg"
            disabled={
              working ||
              (preview.document.duplicate &&
                paymentType === preview.document.paymentType) ||
              preview.document.errors.length > 0
            }
            onClick={() => void onConfirm()}
          >
            {working ? 'Importando...' : 'Confirmar importação'}
          </Button>
        </div>
      </div>
    ) : null}
  </section>
  );
}
