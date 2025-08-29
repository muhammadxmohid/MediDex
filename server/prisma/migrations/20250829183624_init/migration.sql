-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cnic" TEXT,
ADD COLUMN     "mapLocation" TEXT,
ADD COLUMN     "prescriptionFile" TEXT;

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
