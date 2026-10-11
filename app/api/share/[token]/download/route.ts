import { publicPlan } from "@/lib/plans";
import { downloadFileName, resolveDownloadUrl } from "@/lib/files/download";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const plan = await publicPlan(token);
  if (!plan?.primaryImageUrl) return Response.json({ error: "分享已失效" }, { status: 404 });
  const source = resolveDownloadUrl(plan.primaryImageUrl, new URL(request.url).origin);
  const result = await fetch(source, { cache: "no-store" });
  const mime = result.headers.get("content-type") ?? "";
  if (!result.ok || !mime.startsWith("image/")) return Response.json({ error: "图片读取失败" }, { status: 502 });
  return new Response(result.body, { headers: { "content-type": mime, "content-disposition": `attachment; filename="${downloadFileName(mime)}"`, "cache-control": "private, no-store" } });
}
