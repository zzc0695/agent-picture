import { z } from "zod";

export const materialSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  color: z.string().min(1),
  fabric: z.string().min(1),
  priceRange: z.string().min(1),
  sizeNote: z.string().default(""),
  sellingPoints: z.string().default(""),
  imageUrl: z.string().min(1),
});

export const promptTemplateSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  body: z.string().min(1),
});

export const fidelitySchema = z.enum(["strict", "balanced", "creative"]);

export const planSchema = z.object({
  customerName: z.string().min(1),
  notes: z.string().default(""),
  roomImageUrl: z.string().min(1),
  sampleImageUrl: z.string().min(1),
  originalPrompt: z.string().min(1),
  optimizedPrompt: z.string().default(""),
  negativePrompt: z.string().default(""),
  fidelity: fidelitySchema,
  primaryImageUrl: z.string().default(""),
  shortVideoScript: z.string().default(""),
  socialCopy: z.string().default(""),
  customerScript: z.string().default(""),
  status: z.string().default("draft"),
  materialIds: z.array(z.string()).default([]),
});
