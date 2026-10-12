// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { startImageJob, pollImageJob } from "@/lib/ai/image-jobs";
import { db } from "@/lib/db";
import { getBailianImageTask, submitBailianImage } from "@/lib/ai/bailian";
import { persistEffectImage } from "@/lib/ai/image";
vi.mock("@/lib/usage", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/usage")>(), reserveUsage: vi.fn(async (input) => db.generationRecord.create({ data: { ...input, status: "submitting", usageUnits: 0 } })) }));
vi.mock("@/lib/db", () => ({ db: { generationRecord: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() }, customerPlan: { findFirst: vi.fn() }, material: { count: vi.fn() } } }));
vi.mock("@/lib/ai/bailian", () => ({ getBailianConfig: () => ({ apiKey: "key" }), submitBailianImage: vi.fn(), getBailianImageTask: vi.fn() }));
vi.mock("@/lib/ai/image", () => ({ prepareImageGeneration: vi.fn(async () => ({ config: { apiKey: "key", imageModel: "model" }, content: [] })), persistEffectImage: vi.fn() }));
const job = { id: "job", merchantId: "m", type: "image_generation", status: "running", providerTaskId: "provider", createdAt: new Date(), inputSummary: "prompt", timings: { referenceMs: 1 } };
const input = { roomImageUrl: "/demo/room.png", styleImageUrl: "/demo/style.png", detailImageUrl: "/demo/detail.png", optimizedPrompt: "窗帘", fidelity: "balanced" };
describe("durable image jobs", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(db.generationRecord.update).mockImplementation(({ data }) => Promise.resolve({ ...job, ...data }) as never); });
  it("scopes task lookup to the merchant before contacting the provider", async () => {
    vi.mocked(db.generationRecord.findFirst).mockResolvedValue(null);
    expect(await pollImageJob("other", "job")).toBeNull();
    expect(db.generationRecord.findFirst).toHaveBeenCalledWith({ where: { id: "job", merchantId: "other", type: "image_generation" } });
    expect(getBailianImageTask).not.toHaveBeenCalled();
  });
  it("rejects another account's selected material before creating or submitting a task", async () => {
    vi.mocked(db.material.count).mockResolvedValueOnce(0);
    await expect(startImageJob("m", { ...input, detailMaterialId: "other_material" })).rejects.toThrow("素材不存在");
    expect(db.material.count).toHaveBeenCalledWith({ where: { id: { in: ["other_material"] }, merchantId: "m" } });
    expect(db.generationRecord.create).not.toHaveBeenCalled(); expect(submitBailianImage).not.toHaveBeenCalled();
  });
  it("returns a saved result without contacting or charging the provider again", async () => {
    vi.mocked(db.generationRecord.findFirst).mockResolvedValue({ ...job, status: "succeeded", resultImageUrl: "/uploads/result.png" } as never);
    expect(await pollImageJob("m", "job")).toMatchObject({ status: "succeeded", imageUrl: "/uploads/result.png" });
    expect(getBailianImageTask).not.toHaveBeenCalled();
  });
  it("keeps pending tasks recoverable", async () => {
    vi.mocked(db.generationRecord.findFirst).mockResolvedValue(job as never);
    vi.mocked(getBailianImageTask).mockResolvedValue({ status: "RUNNING", imageUrl: undefined });
    expect(await pollImageJob("m", "job")).toMatchObject({ status: "running" });
    expect(persistEffectImage).not.toHaveBeenCalled();
  });
  it("records model failures", async () => {
    vi.mocked(db.generationRecord.findFirst).mockResolvedValue(job as never);
    vi.mocked(getBailianImageTask).mockResolvedValue({ status: "FAILED", imageUrl: undefined });
    expect(await pollImageJob("m", "job")).toMatchObject({ status: "failed" });
  });
  it("does not persist twice when another request holds the lease", async () => {
    vi.mocked(db.generationRecord.findFirst).mockResolvedValue(job as never);
    vi.mocked(getBailianImageTask).mockResolvedValue({ status: "SUCCEEDED", imageUrl: "https://result" });
    vi.mocked(db.generationRecord.updateMany).mockResolvedValue({ count: 0 });
    await pollImageJob("m", "job"); expect(persistEffectImage).not.toHaveBeenCalled();
  });
  it("persists a completed image and records elapsed time", async () => {
    vi.mocked(db.generationRecord.findFirst).mockResolvedValue(job as never);
    vi.mocked(getBailianImageTask).mockResolvedValue({ status: "SUCCEEDED", imageUrl: "https://result" });
    vi.mocked(db.generationRecord.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(persistEffectImage).mockResolvedValue("/uploads/result.png");
    expect(await pollImageJob("m", "job")).toMatchObject({ status: "succeeded", imageUrl: "/uploads/result.png" });
    expect(db.generationRecord.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ usageUnits: 1, timings: expect.objectContaining({ totalMs: expect.any(Number) }) }) }));
  });
  it("records submission failures without claiming successful usage", async () => {
    vi.mocked(db.generationRecord.create).mockResolvedValue(job as never);
    vi.mocked(submitBailianImage).mockRejectedValue(new Error("provider down"));
    await expect(startImageJob("m", input)).rejects.toThrow();
    expect(db.generationRecord.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "failed" }) }));
  });
  it("keeps a pre-connection failure as one recoverable job", async () => {
    vi.mocked(db.generationRecord.create).mockResolvedValue({...job,providerTaskId:null,status:'submitting',inputData:input} as never);
    vi.mocked(submitBailianImage).mockRejectedValueOnce(new TypeError('fetch failed',{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}}));
    expect(await startImageJob('m',input)).toMatchObject({status:'submitting'});
    expect(db.generationRecord.create).toHaveBeenCalledTimes(1);
    expect(db.generationRecord.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({timings:expect.objectContaining({stage:'connection',attempts:1})})}));
  });
  it("retries under a lease without reserving another usage record", async () => {
    vi.mocked(db.generationRecord.findFirst).mockResolvedValue({...job,status:'submitting',providerTaskId:null,inputData:input,timings:{stage:'connection',attempts:1,nextAttemptAt:0}} as never);
    vi.mocked(db.generationRecord.updateMany).mockResolvedValue({count:1});
    vi.mocked(submitBailianImage).mockResolvedValueOnce('new-provider');
    expect(await pollImageJob('m','job')).toMatchObject({status:'running'});
    expect(submitBailianImage).toHaveBeenCalledTimes(1);expect(db.generationRecord.create).not.toHaveBeenCalled();
  });
  it("does not submit when another poll holds the retry lease", async () => {
    vi.mocked(db.generationRecord.findFirst).mockResolvedValue({...job,status:'submitting',providerTaskId:null,inputData:input,timings:{stage:'connection',attempts:1,nextAttemptAt:0}} as never);
    vi.mocked(db.generationRecord.updateMany).mockResolvedValue({count:0});
    await pollImageJob('m','job');expect(submitBailianImage).not.toHaveBeenCalled();
  });
  it("does not repeat a request whose submission outcome is uncertain", async () => {
    vi.mocked(db.generationRecord.findFirst).mockResolvedValue({...job,status:'submitting',providerTaskId:null,inputData:input,timings:{stage:'retry_sending',attempts:2}} as never);
    await pollImageJob('m','job');expect(submitBailianImage).not.toHaveBeenCalled();
  });
  it("stops after the third connection attempt", async () => {
    vi.mocked(db.generationRecord.findFirst).mockResolvedValue({...job,status:'submitting',providerTaskId:null,inputData:input,timings:{stage:'connection',attempts:2,nextAttemptAt:0}} as never);
    vi.mocked(db.generationRecord.updateMany).mockResolvedValue({count:1});
    vi.mocked(submitBailianImage).mockRejectedValueOnce(new TypeError('fetch failed',{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}}));
    expect(await pollImageJob('m','job')).toMatchObject({status:'failed'});
    expect(submitBailianImage).toHaveBeenCalledTimes(1);
  });

});
