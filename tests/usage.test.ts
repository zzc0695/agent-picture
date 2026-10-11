// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { reserveUsage, usageConfig, usageDay, UsageLimitError } from "@/lib/usage";
import { db } from "@/lib/db";
const mocks = vi.hoisted(() => ({ count: vi.fn(), create: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));
beforeEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); mocks.transaction.mockImplementation(action => action({ generationRecord: mocks })); mocks.count.mockResolvedValue(0); mocks.create.mockResolvedValue({ id: "reserved" }); });
it("resets at Beijing midnight and allows configurable unlimited counts", () => {
  expect(usageDay(new Date("2026-10-11T16:00:00Z"))).toMatchObject({ date: "2026-10-12", start: new Date("2026-10-11T16:00:00Z"), end: new Date("2026-10-12T16:00:00Z") });
  expect(usageConfig({ AI_DAILY_IMAGE_LIMIT: "0", AI_IMAGE_ESTIMATED_PRICE: "0.12" })).toMatchObject({ dailyImages: 0, imagePrice: 0.12 });
});
it("blocks exhausted image quota before recording or calling a model", async () => {
  vi.stubEnv("AI_DAILY_IMAGE_LIMIT", "2"); mocks.count.mockResolvedValue(2);
  await expect(reserveUsage({ merchantId: "m", type: "image_generation", inputSummary: "p" })).rejects.toBeInstanceOf(UsageLimitError);
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ merchantId: "m", type: "image_generation" }) }));
});
it("blocks a concurrent image and groups all text requests into their daily quota", async () => {
  mocks.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
  await expect(reserveUsage({ merchantId: "m", type: "image_generation", inputSummary: "p" })).rejects.toThrow("已有图片");
  vi.stubEnv("AI_DAILY_TEXT_LIMIT", "3"); mocks.count.mockResolvedValue(3);
  await expect(reserveUsage({ merchantId: "m", type: "marketing_copy", inputSummary: "p" })).rejects.toThrow("额度");
  expect(mocks.count).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ type: { in: ["material_analysis", "prompt_optimization", "marketing_copy"] } }) }));
});
it("reserves unlimited usage with configured estimated cost in a serialized transaction", async () => {
  vi.stubEnv("AI_DAILY_IMAGE_LIMIT", "0"); vi.stubEnv("AI_MAX_CONCURRENT_IMAGES", "0"); vi.stubEnv("AI_IMAGE_ESTIMATED_PRICE", "0.25"); mocks.count.mockResolvedValue(999);
  await reserveUsage({ merchantId: "m", type: "image_generation", inputSummary: "p" });
  expect(mocks.create).toHaveBeenCalledWith({ data: { merchantId: "m", type: "image_generation", inputSummary: "p", status: "submitting", usageUnits: 0, estimatedCost: 0.25 } });
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
});
