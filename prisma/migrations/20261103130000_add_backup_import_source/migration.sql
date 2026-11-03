-- Backup/restore de período: transações restauradas guardam o id original em
-- import_external_id com esta origem, o que torna a restauração idempotente.
ALTER TYPE "TransactionImportSource" ADD VALUE IF NOT EXISTS 'BACKUP';
