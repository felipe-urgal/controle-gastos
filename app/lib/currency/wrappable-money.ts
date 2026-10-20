/**
 * Troca o espaço não separável (NBSP) do `Intl` por um espaço comum para que valores em
 * colunas estreitas quebrem entre "R$" e o número, em vez de partir os dígitos.
 * Não use onde o valor precise permanecer numa linha só.
 */
export function wrappableMoney(value: string): string {
  return value.replace(/ /g, ' ');
}
