import { db } from "@/lib/db";

export async function ownedCustomer(merchantId: string, customerId?: string | null) {
  return customerId ? db.customer.findFirst({ where: { id: customerId, merchantId } }) : null;
}

export async function publicPlan(token: string) {
  return db.customerPlan.findFirst({
    where: { shareToken: token, shareExpiresAt: { gt: new Date() } },
    select: { customerName: true, roomImageUrl: true, primaryImageUrl: true, customerScript: true },
  });
}
