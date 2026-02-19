/*
  Warnings:

  - A unique constraint covering the columns `[symbol]` on the table `Token` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Token_symbol_key" ON "Token"("symbol");
