ALTER TABLE "category" ADD COLUMN "createdById" text;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "createdAt" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;