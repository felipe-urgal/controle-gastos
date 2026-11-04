import { formatCurrency } from '@/app/lib/currency/format-money';
import type {
  FinancialCommitment,
  FinancialCommitmentDate,
  FinancialCommitmentsData,
} from '@/app/types/financial-commitment';

const CRLF = '\r\n';
const PRODID = '-//Controle de Gastos//Compromissos//PT-BR';

/** Texto de iCalendar (RFC 5545 §3.3.11): barra, ponto e vírgula, vírgula e quebra de linha são escapados. */
export function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Linhas passam de 75 octetos são dobradas (RFC 5545 §3.1), sem quebrar um caractere UTF-8 ao meio. */
export function foldIcsLine(line: string) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = 75;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = char;
      currentBytes = bytes;
      limit = 74; // a continuação começa com um espaço
    } else {
      current += char;
      currentBytes += bytes;
    }
  }
  parts.push(current);
  return parts.join(CRLF + ' ');
}

function pad(value: number, size = 2) {
  return String(value).padStart(size, '0');
}

function icsDate(date: FinancialCommitmentDate) {
  return `${pad(date.year, 4)}${pad(date.month)}${pad(date.day)}`;
}

function nextDay(date: FinancialCommitmentDate): FinancialCommitmentDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function icsTimestamp(now: Date) {
  return `${pad(now.getUTCFullYear(), 4)}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

const VERB: Record<FinancialCommitment['direction'], string> = {
  PAYABLE: 'Pagar',
  RECEIVABLE: 'Receber',
  MILESTONE: 'Meta',
};

function eventLines(item: FinancialCommitment, data: FinancialCommitmentsData, stamp: string, showValues: boolean) {
  const description = [
    item.amount !== null && showValues ? `Valor: ${formatCurrency(item.amount, item.currency)}` : null,
    item.accountName ? `Conta: ${item.accountName}` : null,
    item.state === 'OVERDUE' ? 'Já vencido e ainda pendente.' : null,
  ].filter((line): line is string => line !== null);

  return [
    'BEGIN:VEVENT',
    // Estável: importar de novo atualiza o evento em vez de duplicá-lo.
    `UID:${item.source.kind.toLowerCase()}-${item.source.id}@controle-gastos`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(item.date)}`,
    `DTEND;VALUE=DATE:${icsDate(nextDay(item.date))}`,
    `SUMMARY:${escapeIcsText(`${VERB[item.direction]}: ${item.title}`)}`,
    ...(description.length > 0 ? [`DESCRIPTION:${escapeIcsText(description.join('\n'))}`] : []),
    // Compromisso não deve deixar o dia "ocupado" na agenda.
    'TRANSP:TRANSPARENT',
    ...(item.direction === 'PAYABLE' && item.state === 'UPCOMING'
      ? [
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeIcsText(`${VERB[item.direction]}: ${item.title}`)}`,
          // Às 9h do dia anterior (o evento de dia inteiro começa à 0h).
          'TRIGGER:-PT15H',
          'END:VALARM',
        ]
      : []),
    'END:VEVENT',
  ];
}

/**
 * Compromissos financeiros como eventos de dia inteiro (iCalendar), para importar na agenda do celular ou do computador.
 * Valores só entram na descrição e só quando `showValues`; o título nunca leva valor (a agenda pode ficar visível).
 */
export function commitmentsToIcs(
  data: FinancialCommitmentsData,
  { now = new Date(), showValues = true }: { now?: Date; showValues?: boolean } = {},
) {
  const stamp = icsTimestamp(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText('Controle de Gastos · Compromissos')}`,
    ...data.items.flatMap((item) => eventLines(item, data, stamp, showValues)),
    'END:VCALENDAR',
  ];
  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}
