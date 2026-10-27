CREATE TABLE "Feedback" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "merchantId" TEXT NOT NULL,
 "planId" TEXT,
 "recordId" TEXT,
 "category" TEXT NOT NULL,
 "message" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'open',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Feedback_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "Feedback_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CustomerPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "Feedback_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "GenerationRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");
CREATE INDEX "Feedback_merchantId_createdAt_idx" ON "Feedback"("merchantId", "createdAt");
