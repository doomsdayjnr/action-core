/*
  Warnings:

  - A unique constraint covering the columns `[orderIdMemo]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Order_orderIdMemo_key" ON "Order"("orderIdMemo");
