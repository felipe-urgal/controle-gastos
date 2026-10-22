import { Fragment } from 'react';

// Valor formatado por Intl/formatCurrency (símbolo ou código + espaço, normal ou NBSP, + número).
const MONEY_PATTERN = /-?(?:[A-Z]{1,3}\$|[$€£¥]|[A-Z]{3})[\s ]-?\d(?:[\d.,]*\d)?/g;

/** Aplica a fonte numérica somente aos valores monetários de um texto corrido. */
export default function MoneyText({ children }: { children: string }) {
  const parts = children.split(MONEY_PATTERN);
  const amounts = children.match(MONEY_PATTERN) ?? [];

  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {amounts[index] ? <span className="money">{amounts[index]}</span> : null}
        </Fragment>
      ))}
    </>
  );
}
