-- CreateIndex
CREATE INDEX "transactions_userId_status_accountId_type_idx"
ON "transactions"("userId", "status", "accountId", "type");
