import { compareLogicalDates, type LogicalDate } from "@/app/lib/date/logical-date";
import { summaryDedupeKey } from "@/app/lib/notifications/notification-dedupe";
import {
  DAILY_NOTIFICATION_CAP,
  type NotificationCandidate,
} from "@/app/lib/notifications/notification-model";

const SEVERITY_ORDER = { URGENT: 0, WARNING: 1, INFO: 2 } as const;

/** Tira o que já foi avisado, comparando pela chave de deduplicação. */
export function filterNewCandidates(
  candidates: readonly NotificationCandidate[],
  existingKeys: ReadonlySet<string>,
) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (existingKeys.has(candidate.dedupeKey) || seen.has(candidate.dedupeKey)) return false;
    seen.add(candidate.dedupeKey);
    return true;
  });
}

/**
 * Limita os avisos novos do dia: os mais urgentes (e, no empate, os de data mais próxima) saem
 * individualmente; o excedente vira um único aviso-resumo com link para o Dashboard.
 */
export function applyDailyCap(
  candidates: readonly NotificationCandidate[],
  today: LogicalDate,
  cap: number = DAILY_NOTIFICATION_CAP,
): NotificationCandidate[] {
  if (candidates.length <= cap) return [...candidates];

  const sorted = [...candidates].sort(
    (left, right) =>
      SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
      compareLogicalDates(left.date, right.date) ||
      left.dedupeKey.localeCompare(right.dedupeKey),
  );
  const individual = sorted.slice(0, cap - 1);
  const hidden = sorted.length - individual.length;

  return [
    ...individual,
    {
      type: "SUMMARY",
      dedupeKey: summaryDedupeKey(today),
      severity: "INFO",
      title: hidden === 1 ? "Mais 1 item pede atenção" : `Mais ${hidden} itens pedem atenção`,
      body: "Veja a lista completa no Dashboard.",
      href: "/dashboard",
      date: today,
    },
  ];
}
