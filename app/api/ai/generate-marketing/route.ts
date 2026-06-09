import { NextResponse } from "next/server";
import { generateMarketingCopy } from "@/lib/ai/marketing";
import { requireMerchantSession } from "@/lib/auth/require-session";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await requireMerchantSession();
  const body = await request.json();
  const result = await generateMarketingCopy({
    materialSummary: String(body.materialSummary ?? ""),
    roomSummary: String(body.roomSummary ?? ""),
    effectImageUrl: String(body.effectImageUrl ?? ""),
    customerNotes: String(body.customerNotes ?? ""),
  });

  await db.generationRecord.create({
    data: {
      merchantId: session.merchantId,
      planId: body.planId ? String(body.planId) : undefined,
      type: "marketing_copy",
      inputSummary: `${body.materialSummary ?? ""}`.slice(0, 240),
      status: "succeeded",
      usageUnits: 1,
    },
  });

  return NextResponse.json(result);
}
