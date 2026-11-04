import { z } from "zod";

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

export const MAX_PUSH_SUBSCRIPTIONS_PER_USER = 10;

/** Formato de `PushSubscription.toJSON()` do navegador. */
export const pushSubscribeSchema = z.object({
  endpoint: z
    .string()
    .max(2048, "Endpoint de push inválido")
    .url("Endpoint de push inválido")
    .refine((value) => value.startsWith("https://"), "Endpoint de push inválido"),
  keys: z.object({
    p256dh: z.string().min(1).max(256).regex(BASE64URL, "Chave de push inválida"),
    auth: z.string().min(1).max(256).regex(BASE64URL, "Chave de push inválida"),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().min(1).max(2048),
});

export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;
