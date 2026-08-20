import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { downloadFileName, resolveDownloadUrl } from "@/lib/files/download";

export async function GET(request: Request) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();

  try {
    const requestUrl = new URL(request.url);
    const sourceUrl = resolveDownloadUrl(
      requestUrl.searchParams.get("url") ?? "",
      requestUrl.origin,
    );
    const upstream = await fetch(sourceUrl, { cache: "no-store" });
    const contentType = upstream.headers.get("content-type") ?? "";

    if (!upstream.ok || !contentType.startsWith("image/")) {
      return Response.json(
        { error: "高清图片读取失败" },
        { status: 502 },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${downloadFileName(contentType)}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "高清图片下载失败",
      },
      { status: 400 },
    );
  }
}
