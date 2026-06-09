import { SignJWT, jwtVerify } from "jose";

const cookieName = "merchant_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-secret-with-more-than-32-characters",
);

export type MerchantSession = {
  merchantId: string;
  email: string;
};

export const sessionCookieName = cookieName;

export async function createSessionToken(session: MerchantSession) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function readSessionToken(
  token: string | undefined,
): Promise<MerchantSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.merchantId !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }

    return { merchantId: payload.merchantId, email: payload.email };
  } catch {
    return null;
  }
}
