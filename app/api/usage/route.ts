import { NextResponse } from "next/server";
import { requireMerchantSession, unauthorizedResponse } from "@/lib/auth/require-session";
import { usageSummary } from "@/lib/usage";
export async function GET() { const session = await requireMerchantSession(); if (!session) return unauthorizedResponse(); return NextResponse.json(await usageSummary(session.merchantId)); }
