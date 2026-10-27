ALTER TABLE "Merchant" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "Merchant" ADD COLUMN "username" TEXT, ADD COLUMN "invitationId" TEXT;
CREATE UNIQUE INDEX "Merchant_username_key" ON "Merchant"("username");
CREATE TABLE "Invitation" (
 "id" TEXT NOT NULL PRIMARY KEY, "code" TEXT NOT NULL, "label" TEXT NOT NULL,
 "maxUses" INTEGER NOT NULL, "usedCount" INTEGER NOT NULL DEFAULT 0,
 "expiresAt" TIMESTAMP(3) NOT NULL, "disabled" BOOLEAN NOT NULL DEFAULT false,
 "dailyImages" INTEGER NOT NULL DEFAULT 5, "dailyText" INTEGER NOT NULL DEFAULT 10,
 "concurrentImages" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdById" TEXT NOT NULL,
 CONSTRAINT "Invitation_limits_check" CHECK ("maxUses" > 0 AND "usedCount" >= 0 AND "usedCount" <= "maxUses" AND "dailyImages" > 0 AND "dailyText" > 0 AND "concurrentImages" > 0),
 CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Invitation_code_key" ON "Invitation"("code");
CREATE INDEX "Invitation_createdAt_idx" ON "Invitation"("createdAt");
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
