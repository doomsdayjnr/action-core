-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'BASE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('TRANSFER', 'PHYSICAL', 'DIGITAL', 'SPL_TOKEN', 'NFT_MINT', 'SUBSCRIPTION');

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "payoutAddress" TEXT,
    "email" TEXT,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "activeBlinksLimit" INTEGER NOT NULL DEFAULT 3,
    "externalCustomerId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 6,
    "logoUrl" TEXT,
    "isStable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blink" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "actionType" "ActionType" NOT NULL DEFAULT 'TRANSFER',
    "tokenMintId" TEXT,
    "requiresShipping" BOOLEAN NOT NULL DEFAULT false,
    "deliveryMethod" TEXT,
    "deliveryConfig" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "slug" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "blinkId" TEXT NOT NULL,
    "customerWallet" TEXT NOT NULL,
    "customerEmail" TEXT,
    "shippingAddress" TEXT,
    "shippingName" TEXT,
    "shippingPhone" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "feeAmount" DOUBLE PRECISION NOT NULL,
    "merchantAmount" DOUBLE PRECISION NOT NULL,
    "tokenMintId" TEXT,
    "tokenDecimals" INTEGER NOT NULL DEFAULT 9,
    "deliveryStatus" TEXT DEFAULT 'PENDING',
    "deliveryAttemptedAt" TIMESTAMP(3),
    "deliveryError" TEXT,
    "transactionSignature" TEXT,
    "orderIdMemo" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_walletAddress_key" ON "Merchant"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_apiKey_key" ON "Merchant"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_merchantId_key" ON "Subscription"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_externalCustomerId_key" ON "Subscription"("externalCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Token_mintAddress_key" ON "Token"("mintAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Blink_slug_key" ON "Blink"("slug");

-- CreateIndex
CREATE INDEX "Blink_merchantId_idx" ON "Blink"("merchantId");

-- CreateIndex
CREATE INDEX "Blink_tokenMintId_idx" ON "Blink"("tokenMintId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_transactionSignature_key" ON "Order"("transactionSignature");

-- CreateIndex
CREATE INDEX "Order_merchantId_idx" ON "Order"("merchantId");

-- CreateIndex
CREATE INDEX "Order_blinkId_idx" ON "Order"("blinkId");

-- CreateIndex
CREATE INDEX "Order_customerWallet_idx" ON "Order"("customerWallet");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_orderIdMemo_idx" ON "Order"("orderIdMemo");

-- CreateIndex
CREATE INDEX "Order_tokenMintId_idx" ON "Order"("tokenMintId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blink" ADD CONSTRAINT "Blink_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blink" ADD CONSTRAINT "Blink_tokenMintId_fkey" FOREIGN KEY ("tokenMintId") REFERENCES "Token"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_blinkId_fkey" FOREIGN KEY ("blinkId") REFERENCES "Blink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tokenMintId_fkey" FOREIGN KEY ("tokenMintId") REFERENCES "Token"("id") ON DELETE SET NULL ON UPDATE CASCADE;
