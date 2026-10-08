'use client';

import { useEffect, useRef, useState } from 'react';
import { FaCamera, FaCheck, FaTimes } from 'react-icons/fa';

import {
  parseReceiptOcrText,
  type ReceiptOcrSuggestions,
  getApplicableReceiptOcrSuggestions,
} from '@/app/lib/receipts/receipt-ocr-parser';
import { recognizeReceiptImage } from '@/app/lib/receipts/receipt-ocr-browser';

interface ReceiptOcrScannerProps {
  disabled?: boolean;
  className?: string;
  onApply: (suggestions: ReceiptOcrSuggestions) => void;
}

interface ReceiptOcrResult {
  text: string;
  suggestions: ReceiptOcrSuggestions;
}

function formatSuggestedAmount(amountCents: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatSuggestedDate(date: NonNullable<ReceiptOcrSuggestions['date']>['value']) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(Date.UTC(date.year, date.month - 1, date.day)),
  );
}

export default function ReceiptOcrScanner({
  disabled = false,
  className = '',
  onApply,
}: ReceiptOcrScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ReceiptOcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  function resetPicker() {
    if (inputRef.current) inputRef.current.value = '';
  }

  function openPicker() {
    setError(null);
    setResult(null);
    resetPicker();
    inputRef.current?.click();
  }

  async function processFile(file: File) {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsProcessing(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const text = await recognizeReceiptImage(file, {
        signal: controller.signal,
        onProgress: setProgress,
      });

      if (controller.signal.aborted) return;

      setProgress(1);
      setResult({
        text,
        suggestions: parseReceiptOcrText(text),
      });
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível ler o recibo. Tente outra imagem.',
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsProcessing(false);
      }
    }
  }

  const applicable = getApplicableReceiptOcrSuggestions(result?.suggestions ?? {});
  const hasSuggestions = Boolean(applicable.amountCents || applicable.date || applicable.description);
  const confidenceLabel = { high: 'Alta', medium: 'Média', low: 'Baixa — somente revisão' } as const;

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
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orbit-focus)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaCamera aria-hidden="true" />
          Ler recibo
        </button>
      ) : null}

      {isProcessing ? (
        <div
          className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-3"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">Lendo recibo localmente</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                A imagem não é enviada ao servidor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => abortControllerRef.current?.abort()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-[9px] px-2.5 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              <FaTimes aria-hidden="true" />
              Cancelar
            </button>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-raised)]"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-[var(--orbit-primary)] transition-[width]"
              style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-[12px] border border-[var(--danger)] bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={openPicker}
            className="mt-2 font-semibold underline underline-offset-2"
          >
            Tentar outra imagem
          </button>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Sugestões do recibo</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Revise antes de aplicar. A transação só será criada na confirmação normal do formulário.
              </p>
            </div>
            <button
              type="button"
              onClick={openPicker}
              className="shrink-0 text-xs font-semibold text-[var(--orbit-primary)] hover:underline"
            >
              Trocar imagem
            </button>
          </div>

          {hasSuggestions ? (
            <dl className="mt-3 grid gap-2 text-sm">
              {result.suggestions.amount ? (
                <div className="flex justify-between gap-4 rounded-[9px] bg-[var(--surface-raised)] px-3 py-2">
                  <dt className="text-[var(--text-muted)]">Valor</dt>
                  <dd className="font-semibold text-[var(--foreground)]">
                    {formatSuggestedAmount(result.suggestions.amount.value)}
                    <span className="block text-xs font-normal text-[var(--text-muted)]">Confiança: {confidenceLabel[result.suggestions.amount.confidence]}</span>
                    <span className="block max-w-64 break-words text-xs font-normal text-[var(--text-muted)]">Trecho: {result.suggestions.amount.evidence}</span>
                  </dd>
                </div>
              ) : null}
              {result.suggestions.date ? (
                <div className="flex justify-between gap-4 rounded-[9px] bg-[var(--surface-raised)] px-3 py-2">
                  <dt className="text-[var(--text-muted)]">Data</dt>
                  <dd className="font-semibold text-[var(--foreground)]">
                    {formatSuggestedDate(result.suggestions.date.value)}
                    <span className="block text-xs font-normal text-[var(--text-muted)]">Confiança: {confidenceLabel[result.suggestions.date.confidence]}</span>
                    <span className="block max-w-64 break-words text-xs font-normal text-[var(--text-muted)]">Trecho: {result.suggestions.date.evidence}</span>
                  </dd>
                </div>
              ) : null}
              {result.suggestions.description ? (
                <div className="flex justify-between gap-4 rounded-[9px] bg-[var(--surface-raised)] px-3 py-2">
                  <dt className="text-[var(--text-muted)]">Descrição</dt>
                  <dd className="max-w-[65%] text-right font-semibold text-[var(--foreground)]">
                    {result.suggestions.description.value}
                    <span className="block text-xs font-normal text-[var(--text-muted)]">Confiança: {confidenceLabel[result.suggestions.description.confidence]}</span>
                    <span className="block max-w-64 break-words text-xs font-normal text-[var(--text-muted)]">Trecho: {result.suggestions.description.evidence}</span>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Não foi possível identificar sugestões neste recibo.
            </p>
          )}

          {!hasSuggestions && (result.suggestions.amount || result.suggestions.date || result.suggestions.description) ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">As leituras têm confiança baixa e não serão aplicadas. Confira o texto reconhecido.</p>
          ) : null}

          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-[var(--text-muted)]">
              Ver texto reconhecido
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-[9px] bg-[var(--surface-raised)] p-2.5 text-xs text-[var(--text-muted)]">
              {result.text || 'Nenhum texto reconhecido.'}
            </pre>
          </details>

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                resetPicker();
              }}
              className="min-h-10 rounded-[9px] px-3 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(result.suggestions);
                setResult(null);
                resetPicker();
              }}
              disabled={!hasSuggestions}
              className="inline-flex min-h-10 items-center gap-2 rounded-[9px] bg-[var(--orbit-primary)] px-3.5 text-sm font-semibold text-[var(--orbit-on-primary)] hover:bg-[var(--orbit-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaCheck aria-hidden="true" />
              Aplicar sugestões confiáveis
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
