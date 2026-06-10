import { NextResponse } from "next/server";
import { readStoredUpload } from "@/lib/files/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const stored = await readStoredUpload(file);

  if (!stored) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  return new NextResponse(stored.bytes, {
    headers: {
      "Content-Type": stored.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
