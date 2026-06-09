import { cookies } from "next/headers";
import { readSessionToken, sessionCookieName } from "@/lib/auth/session";

export async function requireMerchantSession() {
  const jar = await cookies();
  const session = await readSessionToken(jar.get(sessionCookieName)?.value);

  if (!session) {
    throw new Response(JSON.stringify({ error: "请先登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return session;
}
