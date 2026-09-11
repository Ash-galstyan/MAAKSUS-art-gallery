-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "orientation" TEXT;

-- CreateIndex
CREATE INDEX "Artwork_orientation_idx" ON "Artwork"("orientation");

-- Backfill orientation from existing physical dimensions.
UPDATE "Artwork" SET "orientation" =
  CASE
    WHEN "widthCm" IS NULL OR "heightCm" IS NULL THEN NULL
    WHEN "widthCm" > "heightCm" THEN 'landscape'
    WHEN "heightCm" > "widthCm" THEN 'portrait'
    ELSE 'square'
  END;
