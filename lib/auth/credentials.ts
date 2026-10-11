import { z } from "zod";
import { cookies } from "next/headers";
import { createSessionToken, sessionCookieName, type MerchantSession } from "./session";
export const credentialsSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(8).max(72).refine(value => new TextEncoder().encode(value).length <= 72) });
export const registrationSchema = credentialsSchema.extend({ name: z.string().trim().min(1).max(80) });
export async function signIn(session: MerchantSession) {
  const jar = await cookies();
  jar.set(sessionCookieName, await createSessionToken(session), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 24 * 3600 });
}
