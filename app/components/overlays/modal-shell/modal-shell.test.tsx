import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ModalShell, lockBodyScroll } from '@/app/components/overlays/modal-shell';

describe('ModalShell', () => {
  it('expõe dialog acessível com descrição, footer e nome do botão de fechar', () => {
    const html = renderToStaticMarkup(
      <ModalShell
        title="Excluir item?"
        description="Não pode ser desfeito"
        closeLabel="Fechar detalhe"
        footer={<button>Confirmar</button>}
        onClose={() => {}}
      >
        <p>Conteúdo</p>
      </ModalShell>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-describedby');
    expect(html).toContain('aria-label="Fechar detalhe"');
    expect(html).toContain('Conteúdo');
    expect(html).toContain('Confirmar');
    expect(html).toContain('data-overlay-hide-nav="true"');
  });

  it('permite manter a bottom-nav e omite footer/descrição quando ausentes', () => {
    const html = renderToStaticMarkup(
      <ModalShell title="Simples" hideBottomNav={false} onClose={() => {}}>
        x
      </ModalShell>,
    );

    expect(html).not.toContain('data-overlay-hide-nav');
    expect(html).not.toContain('aria-describedby');
    expect(html).toContain('aria-label="Fechar"');
  });
});

describe('lockBodyScroll', () => {
  const body = { style: { overflow: 'auto' } };

  beforeEach(() => {
    body.style.overflow = 'auto';
    vi.stubGlobal('document', { body });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('mantém o scroll travado até o último overlay fechar e restaura o valor original', () => {
    const releaseFirst = lockBodyScroll();
    const releaseSecond = lockBodyScroll();
    expect(body.style.overflow).toBe('hidden');

    releaseFirst();
    expect(body.style.overflow).toBe('hidden');

    releaseSecond();
    expect(body.style.overflow).toBe('auto');
  });
});
