import { NotificationType } from "@prisma/client";
import { z } from "zod";

import { MAX_PAGE_SIZE } from "@/app/lib/api/pagination-contract";

const NOTIFICATION_PAGE_SIZE_DEFAULT = 20;
const NOTIFICATION_PAGE_SIZE_MAX = Math.min(50, MAX_PAGE_SIZE);

const notificationTypeSchema = z.enum(Object.values(NotificationType) as [NotificationType, ...NotificationType[]]);

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(NOTIFICATION_PAGE_SIZE_MAX)
    .default(NOTIFICATION_PAGE_SIZE_DEFAULT),
  unreadOnly: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const updateNotificationPreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        type: notificationTypeSchema,
        inApp: z.boolean(),
        email: z.boolean(),
        push: z.boolean(),
      }),
    )
    .min(1, "Informe ao menos uma preferência")
    .max(Object.values(NotificationType).length)
    .refine((items) => new Set(items.map((item) => item.type)).size === items.length, {
      message: "Tipo de aviso repetido",
    }),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
