import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import PageTitle from '@/app/components/base-pages/page-title';

describe('PageTitle', () => {
  it('renderiza um único h1 com eyebrow, descrição e ações', () => {
    const html = renderToStaticMarkup(
      <PageTitle eyebrow="Contexto" title="Tags" description="Descrição" actions={<button>Ação</button>} />,
    );
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('Contexto');
    expect(html).toContain('Descrição');
    expect(html).toContain('Ação');
  });

  it('omite eyebrow, descrição e ações quando ausentes', () => {
    const html = renderToStaticMarkup(<PageTitle title="Só título" />);
    expect(html).toContain('Só título');
    expect(html).not.toContain('uppercase');
    expect(html).not.toContain('<p');
  });
});
