-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "fabric" TEXT NOT NULL,
    "priceRange" TEXT NOT NULL,
    "sizeNote" TEXT NOT NULL,
    "sellingPoints" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPlan" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "roomImageUrl" TEXT NOT NULL,
    "sampleImageUrl" TEXT NOT NULL,
    "originalPrompt" TEXT NOT NULL,
    "optimizedPrompt" TEXT NOT NULL,
    "negativePrompt" TEXT NOT NULL,
    "fidelity" TEXT NOT NULL,
    "primaryImageUrl" TEXT,
    "similarImageUrls" TEXT NOT NULL DEFAULT '[]',
    "shortVideoScript" TEXT,
    "socialCopy" TEXT,
    "customerScript" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanMaterial" (
    "planId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,

    CONSTRAINT "PlanMaterial_pkey" PRIMARY KEY ("planId","materialId")
);

-- CreateTable
CREATE TABLE "GenerationRecord" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "planId" TEXT,
    "type" TEXT NOT NULL,
    "inputSummary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "usageUnits" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPlan" ADD CONSTRAINT "CustomerPlan_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMaterial" ADD CONSTRAINT "PlanMaterial_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CustomerPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanMaterial" ADD CONSTRAINT "PlanMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRecord" ADD CONSTRAINT "GenerationRecord_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRecord" ADD CONSTRAINT "GenerationRecord_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CustomerPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
