ALTER TABLE "CustomerPlan"
ADD COLUMN "styleImageUrl" TEXT,
ADD COLUMN "detailImageUrl" TEXT,
ADD COLUMN "imageAnalysis" TEXT NOT NULL DEFAULT '{}';
