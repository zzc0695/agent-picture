import { NextResponse } from "next/server";
import {
  requireMerchantSession,
  unauthorizedResponse,
} from "@/lib/auth/require-session";
import { isSupportedImageFile, saveUploadedFile, MAX_IMAGE_BYTES } from "@/lib/files/storage";

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  if (!session) return unauthorizedResponse();

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择图片文件" }, { status: 400 });
  }

  if (!isSupportedImageFile(file)) {
    return NextResponse.json({ error: "只支持 JPG、PNG 或 WebP 图片" }, { status: 400 });
  }

  if (!file.size || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "请选择非空且不超过 4MB 的图片" }, { status: 400 });
  try {
    const url = await saveUploadedFile(file);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "图片保存失败，请稍后重试" }, { status: 502 });
  }
}
