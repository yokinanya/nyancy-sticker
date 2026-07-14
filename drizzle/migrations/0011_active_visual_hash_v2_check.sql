DO $$
DECLARE
  invalid_ids text[];
BEGIN
  SELECT ARRAY(
    SELECT id
    FROM "sticker"
    WHERE status <> 'rejected' AND "visualHashV2" IS NULL
    ORDER BY id
    LIMIT 5
  ) INTO invalid_ids;

  IF cardinality(invalid_ids) > 0 THEN
    RAISE EXCEPTION
      'active 贴纸缺少 visualHashV2，迁移已中止。请先运行 pnpm db:backfill-visual-hashes。违规 ID（最多 5 个）：%',
      array_to_string(invalid_ids, ', ');
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "sticker"
  ADD CONSTRAINT "sticker_active_visual_hash_v2_check"
  CHECK (status = 'rejected' OR "visualHashV2" IS NOT NULL);
