'use client';

import { useEffect, useRef, useState } from 'react';
import { FaFilePdf, FaImage, FaPaperclip, FaTrash } from 'react-icons/fa';

import { Alert } from '@/app/components/feedback';
import { Button, IconButton, Input } from '@/app/components/ui';
import { errorMessage } from '@/app/lib/error-message';
import { ATTACHMENT_ACCEPT, formatAttachmentSize, prepareAttachmentFile } from '@/app/lib/transactions/attachment-client';
import {
  transactionService,
  type TransactionAttachmentList,
  type TransactionAttachmentMeta,
} from '@/app/services/transaction-service';

/**
 * Comprovantes do lançamento (foto ou PDF): ficam no próprio banco, com limite por arquivo, por lançamento e por conta.
 * Foto grande é reduzida no navegador antes de enviar. O arquivo abre numa aba nova, com cabeçalhos que impedem execução.
 */
export default function TransactionAttachments({ transactionId }: { transactionId: string }) {
  const [data, setData] = useState<TransactionAttachmentList | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    transactionService
      .listAttachments(transactionId)
      .then((response) => {
        if (active) setData(response.data);
      })
      .catch((cause) => {
        if (!active) return;
        setData({ items: [], limits: { maxBytes: 1_572_864, maxPerTransaction: 5 } });
        setError(errorMessage(cause, 'Não foi possível carregar os comprovantes.'));
      });
    return () => {
      active = false;
    };
  }, [transactionId]);

  async function upload(file: File) {
    setBusy(true);
    setError('');
    try {
      const prepared = await prepareAttachmentFile(file);
      const response = await transactionService.uploadAttachment(transactionId, prepared);
      setData((current) => (current ? { ...current, items: [...current.items, response.data] } : current));
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível anexar o comprovante.'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove(item: TransactionAttachmentMeta) {
    setBusy(true);
    setError('');
    try {
      await transactionService.deleteAttachment(transactionId, item.id);
      setData((current) => (current ? { ...current, items: current.items.filter((entry) => entry.id !== item.id) } : current));
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível remover o comprovante.'));
    } finally {
      setBusy(false);
    }
  }

  if (data === null) return null;
  const full = data.items.length >= data.limits.maxPerTransaction;

  return (
    <section aria-labelledby="attachments-title" className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="attachments-title" className="text-base font-bold">Comprovantes</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Foto ou PDF, até {formatAttachmentSize(data.limits.maxBytes)} cada e {data.limits.maxPerTransaction} por lançamento.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" icon={<FaPaperclip aria-hidden="true" />} onClick={() => input.current?.click()} isLoading={busy} disabled={busy || full}>
          Anexar
        </Button>
        <Input
          ref={input}
          type="file"
          bare
          accept={ATTACHMENT_ACCEPT}
          className="sr-only"
          aria-label="Escolher comprovante"
          onChange={(event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>

      {/* Anuncia ao leitor de tela quando um comprovante entra ou sai. */}
      <div aria-live="polite">
      {data.items.length > 0 ? (
        <ul className="mt-3 divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
          {data.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <span className="text-[var(--text-muted)]" aria-hidden="true">{item.mimeType === 'application/pdf' ? <FaFilePdf /> : <FaImage />}</span>
              <a
                href={`/api/transactions/${transactionId}/attachments/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--primary)] hover:underline"
              >
                {item.filename}
              </a>
              <span className="shrink-0 text-xs text-[var(--text-muted)]">{formatAttachmentSize(item.sizeBytes)}</span>
              <IconButton label={`Remover ${item.filename}`} icon={<FaTrash />} tone="danger" onClick={() => void remove(item)} disabled={busy} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhum comprovante anexado.</p>
      )}
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error" message={error} />
        </div>
      )}
    </section>
  );
}
