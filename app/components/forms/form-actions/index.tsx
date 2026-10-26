import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { FaSave, FaSpinner, FaTimes } from 'react-icons/fa';

import { Button, ShowBelow, ShowFrom } from '@/app/components/ui';

interface FormActionsProps {
  isEditing: boolean;
  loading: boolean;
  onCancel: () => void;
  submitLabel?: string;
  createLabel?: string;
  disabled?: boolean;
  /** No celular: botões compactos na mesma linha, cancelar num canto e salvar no outro. A partir de `sm` não muda. */
  iconsOnMobile?: boolean;
  /** Formulário pronto para enviar: o botão principal ganha um anel que respira. */
  ready?: boolean;
}

/** Anel que pulsa em volta do botão enquanto o formulário está pronto. */
export function ReadyGlow({ ready, fullWidth = false, children }: { ready: boolean; /** O botão ocupa a largura toda da célula (ex.: rodapé do passo a passo mobile). */ fullWidth?: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <span className={`relative ${fullWidth ? 'flex w-full' : 'inline-flex'}`}>
      {ready && !reduce && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full border-2 border-[var(--primary)]"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 1.12, opacity: 0 }}
          transition={{ duration: 1.4, ease: 'easeOut', repeat: Infinity }}
        />
      )}
      {children}
    </span>
  );
}

export default function FormActions({
  isEditing,
  loading,
  onCancel,
  submitLabel = 'Salvar alterações',
  createLabel = 'Criar',
  disabled = false,
  iconsOnMobile = false,
  ready = false,
}: FormActionsProps) {
  const submitText = isEditing ? submitLabel : createLabel;
  const submitIcon = loading ? <FaSpinner className="animate-spin" /> : <FaSave />;

  const regular = (
    <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
      <Button
        type="button"
        onClick={onCancel}
        variant="outline"
        disabled={loading}
        icon={<FaTimes />}
      >
        Cancelar
      </Button>

      <ReadyGlow ready={ready}>
        <Button
          type="submit"
          disabled={loading || disabled}
          isLoading={loading}
          icon={submitIcon}
        >
          {loading ? (isEditing ? 'Salvando...' : 'Criando...') : submitText}
        </Button>
      </ReadyGlow>
    </div>
  );

  if (!iconsOnMobile) return regular;

  return (
    <>
      <ShowBelow breakpoint="sm">
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-5">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            size="compact"
            disabled={loading}
            icon={<FaTimes />}
          >
            Cancelar
          </Button>
          <ReadyGlow ready={ready}>
            <Button
              type="submit"
              size="compact"
              disabled={loading || disabled}
              isLoading={loading}
              icon={submitIcon}
            >
              {loading ? (isEditing ? 'Salvando...' : 'Criando...') : submitText}
            </Button>
          </ReadyGlow>
        </div>
      </ShowBelow>
      <ShowFrom breakpoint="sm">{regular}</ShowFrom>
    </>
  );
}
