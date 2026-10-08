-- Distinguish replay of an identical series request from reuse of a key with changed data.
ALTER TABLE "transaction_series" ADD COLUMN "request_hash" CHAR(64);
