ALTER TABLE "Merchant" ADD COLUMN "onboarded" BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Customer_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Customer_merchantId_idx" ON "Customer"("merchantId");
ALTER TABLE "CustomerPlan" ADD COLUMN "customerId" TEXT, ADD COLUMN "shareToken" TEXT, ADD COLUMN "shareExpiresAt" TIMESTAMP(3);
ALTER TABLE "CustomerPlan" ADD CONSTRAINT "CustomerPlan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "CustomerPlan_shareToken_key" ON "CustomerPlan"("shareToken");
ALTER TABLE "GenerationRecord" ADD COLUMN "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
CREATE INDEX "GenerationRecord_merchantId_createdAt_idx" ON "GenerationRecord"("merchantId", "createdAt");
