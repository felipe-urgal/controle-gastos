import type { RecurrenceFrequency } from "@/app/types/transaction";

export type RecurrencePreset =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export const recurrencePresetOptions: Array<{
  value: RecurrencePreset;
  label: string;
}> = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
];

const recurrenceByPreset: Record<
  RecurrencePreset,
  { frequency: RecurrenceFrequency; interval: number }
> = {
  weekly: { frequency: "WEEKLY", interval: 1 },
  biweekly: { frequency: "WEEKLY", interval: 2 },
  monthly: { frequency: "MONTHLY", interval: 1 },
  quarterly: { frequency: "MONTHLY", interval: 3 },
  yearly: { frequency: "YEARLY", interval: 1 },
};

export function getRecurrencePresetRule(preset: RecurrencePreset) {
  return recurrenceByPreset[preset];
}

export function getRecurrencePresetLabel(preset: RecurrencePreset) {
  return (
    recurrencePresetOptions.find((option) => option.value === preset)?.label ??
    "Recorrente"
  );
}
