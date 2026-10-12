ALTER TABLE "CustomerPlan" ADD COLUMN "sourcePlanId" TEXT;
ALTER TABLE "CustomerPlan" ADD CONSTRAINT "CustomerPlan_sourcePlanId_fkey" FOREIGN KEY ("sourcePlanId") REFERENCES "CustomerPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "CustomerPlan_sourcePlanId_idx" ON "CustomerPlan"("sourcePlanId");
