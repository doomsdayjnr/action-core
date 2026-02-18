-- CreateEnum
CREATE TYPE "BlinkType" AS ENUM ('DIRECT', 'WORDPRESS', 'SHOPIFY', 'API');

-- AlterTable
ALTER TABLE "Blink" ADD COLUMN     "blinkType" "BlinkType" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "publicUrl" TEXT;

-- CreateIndex
CREATE INDEX "Blink_blinkType_idx" ON "Blink"("blinkType");
