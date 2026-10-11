ALTER TABLE "GenerationRecord"
ADD COLUMN "providerTaskId" TEXT,
ADD COLUMN "resultImageUrl" TEXT,
ADD COLUMN "inputData" JSONB,
ADD COLUMN "timings" JSONB,
ADD COLUMN "leaseUntil" TIMESTAMP(3);
