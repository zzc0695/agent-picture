import { NextResponse } from "next/server";
import { isSupportedImageFile, saveUploadedFile } from "@/lib/files/storage";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择图片文件" }, { status: 400 });
  }

  if (!isSupportedImageFile(file)) {
    return NextResponse.json({ error: "只支持图片文件" }, { status: 400 });
  }

  const url = await saveUploadedFile(file);
  return NextResponse.json({ url });
}
