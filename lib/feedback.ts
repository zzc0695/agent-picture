import { z } from "zod";
export const feedbackCategories = { quality: "效果不满意", failure: "生成失败或等待过久", usability: "操作不方便", other: "其他问题" };
export const feedbackStatuses = { open: "待处理", reviewing: "处理中", resolved: "已处理" };
export const feedbackSchema = z.object({ planId: z.string().min(1), category: z.enum(["quality", "failure", "usability", "other"]), message: z.string().trim().min(5, "请至少填写 5 个字").max(2000) }).strict();
export const feedbackUpdateSchema = z.object({ id: z.string().min(1), status: z.enum(["open", "reviewing", "resolved"]) }).strict();
