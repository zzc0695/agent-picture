import { z } from "zod";
import { cookies } from "next/headers";
import { createSessionToken, sessionCookieName, SESSION_MAX_AGE_SECONDS, type MerchantSession } from "./session";
export const passwordSchema = z.string().min(8).max(72).refine(value => new TextEncoder().encode(value).length <= 72);
export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{2,31}$/);
const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const credentialsSchema = z.object({ email: z.string().trim().toLowerCase().max(254).refine(value => emailSchema.safeParse(value).success || usernameSchema.safeParse(value).success), password: passwordSchema });
export const registrationSchema = z.object({ name: z.string().trim().min(1).max(80), username: usernameSchema, email: z.union([emailSchema, z.literal("")]).optional(), password: passwordSchema, inviteCode: z.string().trim().toUpperCase().regex(/^[A-F0-9]{24}$/) }).strict();
export async function signIn(session: MerchantSession) {
  const jar = await cookies();
  jar.set(sessionCookieName, await createSessionToken(session), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_MAX_AGE_SECONDS });
}
