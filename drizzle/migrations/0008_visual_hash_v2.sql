ALTER TABLE "sticker" ADD COLUMN "visualHashV2" text;
--> statement-breakpoint
CREATE INDEX "sticker_visual_hash_v2_active_idx" ON "sticker" USING btree ("visualHashV2") WHERE "sticker"."status" <> 'rejected';
