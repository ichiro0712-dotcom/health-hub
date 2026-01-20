-- CreateTable
CREATE TABLE "UserHealthItemSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "minVal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxVal" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "safeMin" DOUBLE PRECISION,
    "safeMax" DOUBLE PRECISION,
    "tags" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHealthItemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifestyleHabit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifestyleHabit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timing" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "manufacturer" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "masterItemCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionItemAlias" (
    "id" TEXT NOT NULL,
    "inspectionItemId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,

    CONSTRAINT "InspectionItemAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionItemHistory" (
    "id" TEXT NOT NULL,
    "inspectionItemId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "undoCommand" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionItemHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterItem" (
    "code" TEXT NOT NULL,
    "standardName" TEXT NOT NULL,
    "jlac10" TEXT,
    "synonyms" TEXT[],

    CONSTRAINT "MasterItem_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserHealthItemSetting_userId_itemName_key" ON "UserHealthItemSetting"("userId", "itemName");

-- CreateIndex
CREATE UNIQUE INDEX "LifestyleHabit_userId_category_name_key" ON "LifestyleHabit"("userId", "category", "name");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionItem_userId_name_key" ON "InspectionItem"("userId", "name");

-- CreateIndex
CREATE INDEX "InspectionItemAlias_originalName_idx" ON "InspectionItemAlias"("originalName");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionItemAlias_inspectionItemId_originalName_key" ON "InspectionItemAlias"("inspectionItemId", "originalName");

-- AddForeignKey
ALTER TABLE "UserHealthItemSetting" ADD CONSTRAINT "UserHealthItemSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifestyleHabit" ADD CONSTRAINT "LifestyleHabit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplement" ADD CONSTRAINT "Supplement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_masterItemCode_fkey" FOREIGN KEY ("masterItemCode") REFERENCES "MasterItem"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItemAlias" ADD CONSTRAINT "InspectionItemAlias_inspectionItemId_fkey" FOREIGN KEY ("inspectionItemId") REFERENCES "InspectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItemHistory" ADD CONSTRAINT "InspectionItemHistory_inspectionItemId_fkey" FOREIGN KEY ("inspectionItemId") REFERENCES "InspectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
