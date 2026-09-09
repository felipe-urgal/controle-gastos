import { describe, expect, it } from "vitest";

import {
  getRecurrencePresetRule,
  recurrencePresetOptions,
} from "@/app/lib/transactions/recurrence-presets";

describe("recurrence UI presets", () => {
  it("maps the five product options to the supported domain matrix", () => {
    expect(recurrencePresetOptions.map((option) => option.value)).toEqual([
      "weekly",
      "biweekly",
      "monthly",
      "quarterly",
      "yearly",
    ]);
    expect(getRecurrencePresetRule("weekly")).toEqual({
      frequency: "WEEKLY",
      interval: 1,
    });
    expect(getRecurrencePresetRule("biweekly")).toEqual({
      frequency: "WEEKLY",
      interval: 2,
    });
    expect(getRecurrencePresetRule("monthly")).toEqual({
      frequency: "MONTHLY",
      interval: 1,
    });
    expect(getRecurrencePresetRule("quarterly")).toEqual({
      frequency: "MONTHLY",
      interval: 3,
    });
    expect(getRecurrencePresetRule("yearly")).toEqual({
      frequency: "YEARLY",
      interval: 1,
    });
  });
});
