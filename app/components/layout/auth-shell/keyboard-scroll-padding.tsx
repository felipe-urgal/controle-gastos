'use client';

import { useVisualViewportInset } from '@/app/hooks/use-visual-viewport-inset';

/**
 * Mantém o campo focado visível com o teclado virtual aberto nas telas de autenticação
 * (o hook aplica `scroll-padding-bottom` no `<html>` enquanto o teclado estiver aberto).
 */
export function KeyboardScrollPadding() {
  useVisualViewportInset();
  return null;
}
