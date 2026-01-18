import { z } from "zod";

export const usageAnonymousSchema = z.object({
  type: z.literal("anonymous"),
  smelts_used_today: z.number().int().min(0),
  daily_limit: z.number().int().positive(),
  can_process: z.boolean(),
  resets_at: z.string().datetime(),
});

export const usageAuthenticatedSchema = z.object({
  type: z.literal("authenticated"),
  credits_remaining: z.number().int().min(0),
  weekly_credits_max: z.number().int().positive(),
  can_process: z.boolean(),
  resets_at: z.string().datetime(),
  days_until_reset: z.number().int().min(0),
  message: z.string().optional(),
});

export const usageUnlimitedSchema = z.object({
  type: z.literal("unlimited"),
  api_key_status: z.enum(["none", "pending", "valid", "invalid"]),
  can_process: z.boolean(),
});

export const usageResponseSchema = z.discriminatedUnion("type", [
  usageAnonymousSchema,
  usageAuthenticatedSchema,
  usageUnlimitedSchema,
]);

export type UsageResponse = z.infer<typeof usageResponseSchema>;
