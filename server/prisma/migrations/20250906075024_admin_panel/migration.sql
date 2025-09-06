-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "prescriptionFileName" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
