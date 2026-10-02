-- CreateTable
CREATE TABLE "asset_quotes" (
    "id" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reference_at" TIMESTAMP(3) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asset_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_quotes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "asset_quotes_asset_id_key" ON "asset_quotes"("asset_id");

ALTER TABLE "asset_quotes"
ADD CONSTRAINT "asset_quotes_asset_id_fkey"
FOREIGN KEY ("asset_id") REFERENCES "investment_assets"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
