import { AppShell } from "@/components/app-shell";
import { requirePageMerchantSession } from "@/lib/auth/require-session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageMerchantSession();

  return <AppShell accountEmail={session.email}>{children}</AppShell>;
}
