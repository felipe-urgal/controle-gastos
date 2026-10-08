export const PWA_EVENT = "controle-gastos:pwa-event";

export type PwaEventName =
  | "queue_length"
  | "sync_success"
  | "sync_failure"
  | "draft_created"
  | "draft_discarded";

export type PwaEventDetail = {
  name: PwaEventName;
  queueLength?: number;
  failureKind?: string;
  errorCode?: string;
  swVersion?: string;
};

const SAFE_TOKEN = /^[A-Za-z0-9._:-]{1,64}$/;

/**
 * Emite apenas eventos não sensíveis para um coletor opcional (listener de `PWA_EVENT`).
 * Campos fora da allowlist (valor, descrição, ids, conteúdo do localStorage) são descartados
 * por construção e nada é enviado pela rede aqui.
 */
export function emitPwaEvent(event: PwaEventDetail) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;

  const detail: PwaEventDetail = { name: event.name };
  if (Number.isInteger(event.queueLength) && event.queueLength! >= 0) {
    detail.queueLength = event.queueLength;
  }
  for (const field of ["failureKind", "errorCode", "swVersion"] as const) {
    const value = event[field];
    if (typeof value === "string" && SAFE_TOKEN.test(value)) detail[field] = value;
  }
  window.dispatchEvent(new CustomEvent(PWA_EVENT, { detail }));
}
