"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import WorkbenchPage from "@/components/workbench-page";

export function PersistentWorkbench() {
  const pathname = usePathname();
  const params = useSearchParams();
  const explicit = params.get("planId") || params.get("jobId") || (params.has("new") ? "new" : "");
  const [workspace, setWorkspace] = useState<string | null>(pathname === "/" ? explicit : null);
  useEffect(() => {
    if (pathname !== "/") return;
    void Promise.resolve().then(() => setWorkspace(current => explicit || current || ""));
  }, [pathname, explicit]);
  return workspace === null ? null : <div hidden={pathname !== "/"}><WorkbenchPage key={workspace} /></div>;
}
