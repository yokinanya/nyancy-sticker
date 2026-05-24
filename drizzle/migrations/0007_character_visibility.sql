CREATE TYPE "public"."character_visibility" AS ENUM('public', 'hidden', 'admin_only');
--> statement-breakpoint
ALTER TABLE "character" ADD COLUMN "visibility" "character_visibility" DEFAULT 'public' NOT NULL;
--> statement-breakpoint
ALTER TABLE "character" ADD COLUMN "backgroundImageUrl" text;
