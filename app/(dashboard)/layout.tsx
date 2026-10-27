import { AppShell } from "@/components/app-shell";
import { requirePageMerchantSession } from "@/lib/auth/require-session";
import { Suspense } from "react";
import { PersistentWorkbench } from "@/components/persistent-workbench";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageMerchantSession();

  return <AppShell accountEmail={session.email} accountName={session.username}><Suspense fallback={null}><PersistentWorkbench key={session.merchantId} /></Suspense>{children}</AppShell>;
}
