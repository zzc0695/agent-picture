import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { UserManagement } from "@/components/user-management";
export default async function Page() { if (!await requireAdmin()) redirect("/"); return <UserManagement />; }
