CREATE TYPE "SpecialFinishType" AS ENUM ('RGB', 'TEXTURE');

CREATE TABLE "SpecialFinishAsset" (
  "id" UUID NOT NULL,
  "storageKey" VARCHAR(128) NOT NULL,
  "mimeType" VARCHAR(32) NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "sha256" VARCHAR(64) NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "uploadedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpecialFinishAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SpecialFinishAsset_byteSize_check" CHECK ("byteSize" > 0),
  CONSTRAINT "SpecialFinishAsset_dimensions_check" CHECK ("width" > 0 AND "height" > 0)
);

CREATE TABLE "SpecialFinish" (
  "id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "type" "SpecialFinishType" NOT NULL,
  "rgbR" INTEGER,
  "rgbG" INTEGER,
  "rgbB" INTEGER,
  "assetId" UUID,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "SpecialFinish_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SpecialFinish_type_payload_check" CHECK (
    ("type" = 'RGB' AND "rgbR" BETWEEN 0 AND 255 AND "rgbG" BETWEEN 0 AND 255 AND "rgbB" BETWEEN 0 AND 255 AND "assetId" IS NULL)
    OR ("type" = 'TEXTURE' AND "rgbR" IS NULL AND "rgbG" IS NULL AND "rgbB" IS NULL AND "assetId" IS NOT NULL)
  ),
  CONSTRAINT "SpecialFinish_revision_check" CHECK ("revision" > 0)
);

CREATE UNIQUE INDEX "SpecialFinishAsset_storageKey_key" ON "SpecialFinishAsset"("storageKey");
CREATE INDEX "SpecialFinishAsset_uploadedById_idx" ON "SpecialFinishAsset"("uploadedById");
CREATE UNIQUE INDEX "SpecialFinish_assetId_key" ON "SpecialFinish"("assetId");
CREATE INDEX "SpecialFinish_deletedAt_createdAt_idx" ON "SpecialFinish"("deletedAt", "createdAt");
CREATE INDEX "SpecialFinish_name_idx" ON "SpecialFinish"("name");
CREATE INDEX "SpecialFinish_createdById_idx" ON "SpecialFinish"("createdById");

ALTER TABLE "SpecialFinishAsset" ADD CONSTRAINT "SpecialFinishAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpecialFinish" ADD CONSTRAINT "SpecialFinish_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpecialFinish" ADD CONSTRAINT "SpecialFinish_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "SpecialFinishAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
