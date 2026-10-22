import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import MoneyText from '@/app/components/ui/money-text';

describe('MoneyText', () => {
  it('marca só os valores monetários do texto', () => {
    const html = renderToStaticMarkup(<MoneyText>{'R$ 1.234,56 de US$ 10,00 em 30 dias.'}</MoneyText>);

    expect(html).toBe('<span class="money">R$ 1.234,56</span> de <span class="money">US$ 10,00</span> em 30 dias.');
  });

  it('aceita sinal, NBSP e ponto final sem engolir a pontuação', () => {
    const html = renderToStaticMarkup(<MoneyText>{'Saldo -R$ 5,00.'}</MoneyText>);

    expect(html).toBe('Saldo <span class="money">-R$ 5,00</span>.');
  });

  it('mantém textos sem valor e valores ocultos', () => {
    expect(renderToStaticMarkup(<MoneyText>{'Taxas: ••••'}</MoneyText>)).toBe('Taxas: ••••');
  });
});
