CREATE TYPE "public"."similarity_decision" AS ENUM('keep_both');--> statement-breakpoint
CREATE TABLE "sticker_similarity_decision" (
	"leftStickerId" text NOT NULL,
	"rightStickerId" text NOT NULL,
	"decision" "similarity_decision" DEFAULT 'keep_both' NOT NULL,
	"reason" text,
	"createdById" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sticker_similarity_decision_leftStickerId_rightStickerId_pk" PRIMARY KEY("leftStickerId","rightStickerId")
);
--> statement-breakpoint
ALTER TABLE "sticker_similarity_decision" ADD CONSTRAINT "sticker_similarity_decision_leftStickerId_sticker_id_fk" FOREIGN KEY ("leftStickerId") REFERENCES "public"."sticker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticker_similarity_decision" ADD CONSTRAINT "sticker_similarity_decision_rightStickerId_sticker_id_fk" FOREIGN KEY ("rightStickerId") REFERENCES "public"."sticker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticker_similarity_decision" ADD CONSTRAINT "sticker_similarity_decision_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sticker_similarity_decision_right_idx" ON "sticker_similarity_decision" USING btree ("rightStickerId");