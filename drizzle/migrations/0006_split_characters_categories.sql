CREATE TABLE "character" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdById" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character" ADD CONSTRAINT "character_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "character" ("id", "name", "createdById", "createdAt")
SELECT id, name, "createdById", "createdAt"
FROM "category"
WHERE "parentId" IS NULL
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "slug" text;
--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "characterId" text;
--> statement-breakpoint
UPDATE "category"
SET
	"slug" = id,
	"characterId" = "parentId"
WHERE "parentId" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "category" DROP CONSTRAINT "category_parentId_category_id_fk";
--> statement-breakpoint
DROP INDEX "category_parent_idx";
--> statement-breakpoint
DELETE FROM "category" WHERE "parentId" IS NULL;
--> statement-breakpoint
ALTER TABLE "category" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "category" ALTER COLUMN "characterId" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "category" DROP COLUMN "parentId";
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_characterId_character_id_fk" FOREIGN KEY ("characterId") REFERENCES "public"."character"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "category_character_idx" ON "category" USING btree ("characterId");
--> statement-breakpoint
CREATE UNIQUE INDEX "category_character_slug_idx" ON "category" USING btree ("characterId","slug");
