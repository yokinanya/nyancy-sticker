ALTER TABLE "character" ADD COLUMN "sortOrder" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "sortOrder" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
WITH ranked AS (
	SELECT
		id,
		((row_number() OVER (ORDER BY id ASC) - 1) * 10)::int AS "sortOrder"
	FROM "character"
)
UPDATE "character"
SET "sortOrder" = ranked."sortOrder"
FROM ranked
WHERE "character".id = ranked.id;
--> statement-breakpoint
WITH ranked AS (
	SELECT
		id,
		((row_number() OVER (PARTITION BY "characterId" ORDER BY slug ASC) - 1) * 10)::int AS "sortOrder"
	FROM "category"
)
UPDATE "category"
SET "sortOrder" = ranked."sortOrder"
FROM ranked
WHERE "category".id = ranked.id;
