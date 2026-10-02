CREATE TABLE "economic_indicator_observations" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(32) NOT NULL,
    "series_code" INTEGER NOT NULL,
    "value_micros" INTEGER NOT NULL,
    "unit" VARCHAR(32) NOT NULL,
    "period" VARCHAR(32) NOT NULL,
    "reference_date" DATE NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'BCB_SGS',
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "economic_indicator_observations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "economic_indicator_observations_key_reference_date_key"
ON "economic_indicator_observations"("key", "reference_date");

CREATE INDEX "economic_indicator_observations_key_fetched_at_idx"
ON "economic_indicator_observations"("key", "fetched_at");
