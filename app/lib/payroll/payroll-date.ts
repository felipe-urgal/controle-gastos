export type LogicalYearMonthDay = {
  year: number;
  month: number;
  day: number;
};

export function logicalDateParts(
  now: Date = new Date(),
  timeZone = 'America/Sao_Paulo',
): LogicalYearMonthDay {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: value.year,
    month: value.month,
    day: value.day,
  };
}

export function lastClosedPayrollYear(
  now: Date = new Date(),
  timeZone = 'America/Sao_Paulo',
) {
  return logicalDateParts(now, timeZone).year - 1;
}
