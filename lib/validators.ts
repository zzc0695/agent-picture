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

export const materialAnalysisRequestSchema = z.object({
  roomImageUrl: z.string().min(1),
  styleImageUrl: z.string().min(1),
  detailImageUrl: z.string().min(1),
});

export const materialAnalysisResultSchema = z.object({
  roomSummary: z.string().min(1),
  styleSummary: z.string().min(1),
  materialSummary: z.string().min(1),
  templatePrompt: z.string().min(1),
});

export const imageGenerationRequestSchema = z.object({
  roomImageUrl: z.string().min(1),
  styleImageUrl: z.string().min(1),
  detailImageUrl: z.string().min(1),
  optimizedPrompt: z.string().min(1),
  negativePrompt: z.string().default(""),
  fidelity: fidelitySchema,
  imageAnalysis: z.string().default(""),
  referenceImageUrl: z.string().min(1).optional(),
  planId: z.string().min(1).optional(),
  customerId: z.string().min(1).nullable().optional(),
  customerName: z.string().max(80).default(""),
  planName: z.string().max(200).default(""),
  originalPrompt: z.string().default(""),
  styleMaterialId: z.string().default(""),
  detailMaterialId: z.string().default(""),
  materialIds: z.array(z.string()).default([]),
});

export const planSchema = z.object({
  sourcePlanId: z.string().min(1).nullable().optional(),
  customerId: z.string().min(1).nullable().optional(),
  customerName: z.string().min(1),
  notes: z.string().default(""),
  roomImageUrl: z.string().min(1),
  sampleImageUrl: z.string().min(1),
  styleImageUrl: z.string().min(1),
  detailImageUrl: z.string().min(1),
  imageAnalysis: z.string().default("{}"),
  originalPrompt: z.string().min(1),
  optimizedPrompt: z.string().default(""),
  negativePrompt: z.string().default(""),
  fidelity: fidelitySchema,
  primaryImageUrl: z.string().default(""),
  shortVideoScript: z.string().default(""),
  socialCopy: z.string().default(""),
  customerScript: z.string().default(""),
  status: z.enum(["draft", "ready", "delivered"]).default("draft"),
  materialIds: z.array(z.string()).default([]),
});

export const customerSchema = z.object({ name: z.string().trim().min(1).max(80), contact: z.string().trim().max(160).default(""), notes: z.string().trim().max(2000).default("") });
