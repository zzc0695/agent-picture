import { z } from "zod";
export const invitationSchema = z.object({
 label: z.string().trim().min(1).max(80),
 maxUses: z.number().int().min(1).max(1000),
 validDays: z.number().int().min(1).max(90),
 dailyImages: z.number().int().min(1).max(1000).default(5),
 dailyText: z.number().int().min(1).max(1000).default(10),
 concurrentImages: z.number().int().min(1).max(10).default(1),
}).strict();
export const invitationUpdateSchema = z.object({ id: z.string().min(1), disabled: z.boolean() }).strict();
