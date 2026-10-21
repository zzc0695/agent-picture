"use client";
import { Download, Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function DeliveryActions({ token }: { token: string }) {
  return <div className="flex flex-wrap gap-3 print:hidden">
    <Button onClick={() => window.print()}><Printer aria-hidden="true" />打印 / 保存 PDF</Button>
    <a className={buttonVariants({ variant: "outline" })} href={`/api/share/${token}/download`}><Download aria-hidden="true" />下载效果图</a>
  </div>;
}
