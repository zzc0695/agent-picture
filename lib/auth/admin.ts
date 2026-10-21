import { requireMerchantSession } from "@/lib/auth/require-session";
export function isAdmin(email: string) { return (process.env.ADMIN_EMAILS ?? "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase()); }
export async function requireAdmin() { const s = await requireMerchantSession(); return s && isAdmin(s.email) ? s : null; }
