'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { Alert } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import QuickEntryPreview from '@/app/components/layout/global-search-dialog/quick-entry-preview';
import { todayLogicalDate } from '@/app/lib/date/logical-date';
import { takeSharedImage } from '@/app/lib/pwa/share-image';
import {
  getApplicableReceiptOcrSuggestions,
  parseReceiptOcrText,
} from '@/app/lib/receipts/receipt-ocr-parser';
import { recognizeReceiptImage, type ReceiptOcrPhase } from '@/app/lib/receipts/receipt-ocr-browser';
import { isReceiptOcrCancellation } from '@/app/lib/receipts/receipt-ocr-errors';
import { errorMessage } from '@/app/lib/error-message';
import { parseQuickEntry, type QuickEntryParsed } from '@/app/lib/transactions/quick-entry';
import { draftFromReceipt, readShareParams } from '@/app/lib/transactions/share-target';

type View =
  | { kind: 'loading'; phase: ReceiptOcrPhase | null; progress: number }
  | { kind: 'draft'; draft: QuickEntryParsed; source: 'text' | 'image' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' };

const PHASE_LABEL: Record<ReceiptOcrPhase, string> = {
  preparing: 'Preparando a imagem…',
  loading: 'Carregando o leitor de recibos…',
  reading: 'Lendo o recibo…',
};

/**
 * Destino do "compartilhar para o app" (Android, PWA instalado): o texto de uma notificação de
 * banco ou a foto de um recibo viram a prévia do lançamento, que só grava depois da confirmação.
 * O texto passa pelo interpretador do lançamento rápido; a imagem passa pelo OCR de recibo, que
 * roda no navegador (a imagem nunca vai para o servidor).
 */
export default function SharePage() {
  const router = useRouter();
  const searchKey = useSearchParams().toString();
  const { text, hasImage } = useMemo(() => readShareParams(new URLSearchParams(searchKey)), [searchKey]);
  const [view, setView] = useState<View>(
    text || hasImage ? { kind: 'loading', phase: null, progress: 0 } : { kind: 'empty' },
  );

  useEffect(() => {
    if (!text && !hasImage) return;

    const controller = new AbortController();
    const today = todayLogicalDate();

    async function resolve() {
      // O texto vem primeiro: se ele já é um lançamento claro, a imagem nem precisa ser lida.
      let textMessage: string | null = null;
      if (text) {
        const parsed = parseQuickEntry(text, today);
        if (parsed.ok) {
          setView({ kind: 'draft', draft: parsed, source: 'text' });
          return;
        }
        textMessage = parsed.message;
      }

      if (!hasImage) {
        setView({ kind: 'error', message: textMessage ?? 'Não consegui entender o texto compartilhado.' });
        return;
      }

      try {
        const file = await takeSharedImage();
        if (!file) {
          setView({
            kind: 'error',
            message: textMessage ?? 'A imagem compartilhada não chegou ou expirou. Compartilhe de novo.',
          });
          return;
        }

        const recognized = await recognizeReceiptImage(file, {
          signal: controller.signal,
          onPhase: (phase) => setView({ kind: 'loading', phase, progress: 0 }),
          onProgress: (progress) =>
            setView((current) => (current.kind === 'loading' ? { ...current, progress } : current)),
        });
        const draft = draftFromReceipt(
          getApplicableReceiptOcrSuggestions(parseReceiptOcrText(recognized)),
          today,
        );
        setView(
          draft
            ? { kind: 'draft', draft, source: 'image' }
            : { kind: 'error', message: 'Não consegui ler o valor do recibo com segurança. Lance pelo formulário.' },
        );
      } catch (error) {
        if (isReceiptOcrCancellation(error) || controller.signal.aborted) return;
        setView({ kind: 'error', message: errorMessage(error, 'Não foi possível ler a imagem.') });
      }
    }

    void resolve();
    return () => controller.abort();
  }, [text, hasImage]);

  return (
    <ProtectedRoute>
      <PageTitle title="Lançar do compartilhado" sidebarAligned />
      <PageContainer>
        <div className="mx-auto mt-4 max-w-2xl space-y-4">
          {text && (
            <section aria-label="Texto compartilhado" className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-subtle)]">Texto compartilhado</h2>
              {/* Texto de fora do app: sempre como texto, nunca como HTML. */}
              <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap break-words text-sm text-[var(--text-muted)]">{text}</p>
            </section>
          )}

          {view.kind === 'loading' && (
            <p role="status" className="text-sm text-[var(--text-muted)]">
              {view.phase ? PHASE_LABEL[view.phase] : 'Lendo o que você compartilhou…'}
              {view.phase === 'reading' && view.progress > 0 ? ` ${Math.round(view.progress * 100)}%` : ''}
            </p>
          )}

          {view.kind === 'draft' && (
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              {view.source === 'image' && (
                <p className="mb-3 text-xs text-[var(--text-muted)]">
                  Lido do recibo. Confira o valor, a data e a descrição antes de lançar.
                </p>
              )}
              <QuickEntryPreview
                draft={view.draft}
                today={todayLogicalDate()}
                backLabel="Formulário completo"
                onBack={() => router.push('/transacoes/nova')}
                onClose={() => router.push('/transacoes')}
              />
            </section>
          )}

          {view.kind === 'error' && (
            <div className="space-y-3">
              <Alert variant="error" message={view.message} />
              <Link
                href="/transacoes/nova"
                className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              >
                Abrir nova transação
              </Link>
            </div>
          )}

          {view.kind === 'empty' && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-muted)]">
                Nada para lançar por aqui. No Android, compartilhe a notificação do banco ou a foto de um recibo
                com o Controle de Gastos. Se você compartilhou uma imagem, abra o app uma vez e tente de novo.
              </p>
              <Link
                href="/transacoes/nova"
                className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              >
                Abrir nova transação
              </Link>
            </div>
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
