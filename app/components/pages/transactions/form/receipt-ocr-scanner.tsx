'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FaCamera, FaCheck, FaTimes } from 'react-icons/fa';

import {
  getApplicableReceiptOcrSuggestions,
  isReceiptAmountCompatibleWithCurrency,
  parseReceiptOcrText,
  type ReceiptOcrApplication,
  type ReceiptOcrSuggestions,
} from '@/app/lib/receipts/receipt-ocr-parser';
import { recognizeReceiptImage, type ReceiptOcrPhase } from '@/app/lib/receipts/receipt-ocr-browser';
import { isReceiptOcrCancellation } from '@/app/lib/receipts/receipt-ocr-errors';

/** Current form state, so OCR never silently replaces what the user already entered. */
export interface ReceiptOcrFormState {
  amountFilled: boolean;
  descriptionFilled: boolean;
  dateFixed: boolean;
  /** Currency of the selected account; OCR amounts are BRL only. */
  currency?: string;
}

interface ReceiptOcrScannerProps {
  disabled?: boolean;
  className?: string;
  formState?: ReceiptOcrFormState;
  onApply: (application: ReceiptOcrApplication) => void;
}

type FieldKey = 'amount' | 'date' | 'description';

interface ReceiptOcrResult {
  text: string;
  suggestions: ReceiptOcrSuggestions;
  selected: Record<FieldKey, boolean>;
}

const PHASE_LABEL: Record<ReceiptOcrPhase, string> = {
  preparing: 'Preparando imagem…',
  loading: 'Carregando leitor de recibos…',
  reading: 'Lendo texto…',
};

const CONFIDENCE_LABEL = { high: 'Alta', medium: 'Média', low: 'Baixa — somente revisão' } as const;

const BUTTON_FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orbit-focus)]';

function formatSuggestedAmount(amountCents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amountCents / 100);
}

function formatSuggestedDate(date: { year: number; month: number; day: number }) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(Date.UTC(date.year, date.month - 1, date.day)),
  );
}

function SuggestionRow({
  label,
  value,
  confidence,
  evidence,
  checked,
  disabled,
  note,
  onChange,
}: {
  label: string;
  value: ReactNode;
  confidence: keyof typeof CONFIDENCE_LABEL;
  evidence: string;
  checked: boolean;
  disabled: boolean;
  note?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <li className="rounded-[9px] bg-[var(--surface-raised)]">
      <label
        className={`flex min-h-11 items-start gap-3 px-3 py-2 ${disabled ? 'opacity-70' : 'cursor-pointer'}`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 size-5 shrink-0"
          aria-label={`Aplicar ${label.toLowerCase()}`}
        />
        <span className="min-w-0 flex-1 text-sm">
          <span className="text-[var(--text-muted)]">{label}</span>
          <span className="block break-words font-semibold text-[var(--foreground)]">{value}</span>
          <span className="block text-xs text-[var(--text-muted)]">
            Confiança: {CONFIDENCE_LABEL[confidence]}
          </span>
          <span className="block break-words text-xs text-[var(--text-muted)]">Trecho: {evidence}</span>
          {note ? <span className="block text-xs font-semibold text-[var(--foreground)]">{note}</span> : null}
        </span>
      </label>
    </li>
  );
}

export default function ReceiptOcrScanner({
  disabled = false,
  className = '',
  formState = { amountFilled: false, descriptionFilled: false, dateFixed: false },
  onApply,
}: ReceiptOcrScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerButtonRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState<ReceiptOcrPhase>('preparing');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ReceiptOcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const focusTargetRef = useRef<'result' | 'error' | 'picker' | null>(null);
  const [focusVersion, setFocusVersion] = useState(0);

  function requestFocus(target: 'result' | 'error' | 'picker') {
    focusTargetRef.current = target;
    setFocusVersion((version) => version + 1);
  }

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const focusTarget = focusTargetRef.current;
    if (!focusTarget) return;
    focusTargetRef.current = null;
    const target =
      focusTarget === 'result' ? resultRef.current
        : focusTarget === 'error' ? errorRef.current
          : pickerButtonRef.current;
    target?.focus();
  }, [focusVersion]);

  function resetPicker() {
    if (inputRef.current) inputRef.current.value = '';
  }

  function openPicker() {
    setError(null);
    setResult(null);
    resetPicker();
    inputRef.current?.click();
  }

  function cancelProcessing() {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
    resetPicker();
    requestFocus('picker');
  }

  async function processFile(file: File) {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsProcessing(true);
    setPhase('preparing');
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const text = await recognizeReceiptImage(file, {
        signal: controller.signal,
        onPhase: setPhase,
        onProgress: setProgress,
      });

      if (controller.signal.aborted) return;

      const suggestions = parseReceiptOcrText(text);
      const amountAllowed = isReceiptAmountCompatibleWithCurrency(suggestions, formState.currency);
      setResult({
        text,
        suggestions,
        selected: {
          amount: amountAllowed && !formState.amountFilled,
          date: !formState.dateFixed,
          description: !formState.descriptionFilled,
        },
      });
      requestFocus('result');
    } catch (caught) {
      if (controller.signal.aborted || isReceiptOcrCancellation(caught)) return;
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível ler o recibo. Tente outra imagem.',
      );
      requestFocus('error');
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsProcessing(false);
      }
    }
  }

  function discard() {
    setResult(null);
    resetPicker();
    requestFocus('picker');
  }

  const applicable = getApplicableReceiptOcrSuggestions(result?.suggestions ?? {}, {
    accountCurrency: formState.currency,
  });
  const selected = result?.selected;
  const canApply = Boolean(
    selected &&
      ((selected.amount && applicable.amountCents !== undefined) ||
        (selected.date && applicable.date !== undefined && !formState.dateFixed) ||
        (selected.description && applicable.description !== undefined)),
  );
  const hasAnySuggestion = Boolean(
    result &&
      (result.suggestions.amount || result.suggestions.date || result.suggestions.description),
  );
  const currencyBlocked =
    result && result.suggestions.amount && !isReceiptAmountCompatibleWithCurrency(result.suggestions, formState.currency);

  function toggle(field: FieldKey, checked: boolean) {
    setResult((current) =>
      current ? { ...current, selected: { ...current.selected, [field]: checked } } : current,
    );
  }

  function apply() {
    if (!result) return;
    onApply({
      amountCents: result.selected.amount ? applicable.amountCents : undefined,
      date: result.selected.date && !formState.dateFixed ? applicable.date : undefined,
      description: result.selected.description ? applicable.description : undefined,
    });
    setResult(null);
    resetPicker();
    requestFocus('picker');
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        className="sr-only"
        aria-label="Selecionar foto de recibo"
        disabled={disabled || isProcessing}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void processFile(file);
        }}
      />

      {!isProcessing && !result ? (
        <button
          ref={pickerButtonRef}
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_FOCUS}`}
        >
          <FaCamera aria-hidden="true" />
          Ler recibo
        </button>
      ) : null}

      {isProcessing ? (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">Lendo recibo localmente</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                A imagem é lida neste dispositivo e não é enviada ao servidor.
              </p>
              {/* Announces phase changes only; the bar below is decorative to avoid per-percent spam. */}
              <p className="mt-1 text-xs font-semibold text-[var(--foreground)]" role="status" aria-live="polite">
                {PHASE_LABEL[phase]}
              </p>
            </div>
            <button
              type="button"
              onClick={cancelProcessing}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] ${BUTTON_FOCUS}`}
            >
              <FaTimes aria-hidden="true" />
              Cancelar
            </button>
          </div>
          {phase === 'reading' ? (
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-raised)]"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-[var(--orbit-primary)] transition-[width]"
                style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          className="rounded-[12px] border border-[var(--danger)] bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={openPicker}
            className={`mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-2 ${BUTTON_FOCUS}`}
          >
            Tentar outra imagem
          </button>
        </div>
      ) : null}

      {result ? (
        <div
          ref={resultRef}
          tabIndex={-1}
          aria-label="Sugestões do recibo"
          className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-3 focus:outline-none"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">Sugestões do recibo</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Escolha o que aplicar e revise. A transação só será criada na confirmação normal do formulário.
              </p>
            </div>
            <button
              type="button"
              onClick={openPicker}
              className={`inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-[var(--orbit-primary)] hover:underline ${BUTTON_FOCUS}`}
            >
              Trocar imagem
            </button>
          </div>

          {result.suggestions.inconsistentAmountEvidence ? (
            <p role="alert" className="mt-3 break-words rounded-[9px] border border-[var(--danger)] bg-[var(--danger-subtle)] p-2.5 text-sm text-[var(--expense)]">
              Leitura de valor inconsistente com os limites da transação. O valor não será aplicado. Confira: {result.suggestions.inconsistentAmountEvidence}
            </p>
          ) : null}

          {currencyBlocked ? (
            <p role="alert" className="mt-3 rounded-[9px] border border-[var(--danger)] bg-[var(--danger-subtle)] p-2.5 text-sm text-[var(--expense)]">
              O OCR lê valores em reais (BRL). O valor não será aplicado a uma conta em outra moeda e nenhuma conversão é feita.
            </p>
          ) : null}

          {hasAnySuggestion ? (
            <ul className="mt-3 grid gap-2">
              {result.suggestions.amount ? (
                <SuggestionRow
                  label="Valor"
                  value={formatSuggestedAmount(result.suggestions.amount.value)}
                  confidence={result.suggestions.amount.confidence}
                  evidence={result.suggestions.amount.evidence}
                  checked={result.selected.amount && applicable.amountCents !== undefined}
                  disabled={applicable.amountCents === undefined}
                  note={
                    applicable.amountCents === undefined
                      ? 'Não será aplicado'
                      : formState.amountFilled ? 'Já preenchido — marque para substituir' : undefined
                  }
                  onChange={(checked) => toggle('amount', checked)}
                />
              ) : null}
              {result.suggestions.date ? (
                <SuggestionRow
                  label="Data"
                  value={formatSuggestedDate(result.suggestions.date.value)}
                  confidence={result.suggestions.date.confidence}
                  evidence={result.suggestions.date.evidence}
                  checked={result.selected.date && applicable.date !== undefined && !formState.dateFixed}
                  disabled={applicable.date === undefined || formState.dateFixed}
                  note={
                    formState.dateFixed
                      ? 'Data fixa — não será alterada'
                      : applicable.date === undefined ? 'Não será aplicado' : undefined
                  }
                  onChange={(checked) => toggle('date', checked)}
                />
              ) : null}
              {result.suggestions.description ? (
                <SuggestionRow
                  label="Descrição"
                  value={result.suggestions.description.value}
                  confidence={result.suggestions.description.confidence}
                  evidence={result.suggestions.description.evidence}
                  checked={result.selected.description && applicable.description !== undefined}
                  disabled={applicable.description === undefined}
                  note={
                    applicable.description === undefined
                      ? 'Não será aplicado'
                      : formState.descriptionFilled ? 'Já preenchida — marque para substituir' : undefined
                  }
                  onChange={(checked) => toggle('description', checked)}
                />
              ) : null}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Não foi possível identificar sugestões neste recibo.
            </p>
          )}

          <details className="mt-3">
            <summary className={`flex min-h-11 cursor-pointer items-center text-sm font-semibold text-[var(--text-muted)] ${BUTTON_FOCUS}`}>
              Ver texto reconhecido
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-[9px] bg-[var(--surface-raised)] p-2.5 text-xs text-[var(--text-muted)]">
              {result.text || 'Nenhum texto reconhecido.'}
            </pre>
          </details>

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={discard}
              className={`min-h-11 rounded-[9px] px-3 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-hover)] ${BUTTON_FOCUS}`}
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!canApply}
              className={`inline-flex min-h-11 items-center gap-2 rounded-[9px] bg-[var(--orbit-primary)] px-3.5 text-sm font-semibold text-[var(--orbit-on-primary)] hover:bg-[var(--orbit-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_FOCUS}`}
            >
              <FaCheck aria-hidden="true" />
              Aplicar selecionados
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
