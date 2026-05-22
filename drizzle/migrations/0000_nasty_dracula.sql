CREATE TYPE "public"."sticker_ext" AS ENUM('png', 'gif', 'webp', 'jpg', 'jpeg');--> statement-breakpoint
CREATE TYPE "public"."sticker_status" AS ENUM('approved', 'pending', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parentId" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sticker" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"src" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"ext" "sticker_ext" NOT NULL,
	"hash" text NOT NULL,
	"categoryId" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "sticker_status" DEFAULT 'pending' NOT NULL,
	"submittedById" text,
	"approvedById" text,
	"submittedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"approvedAt" timestamp with time zone,
	"rejectionReason" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"githubLogin" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_githubLogin_unique" UNIQUE("githubLogin")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_category_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticker" ADD CONSTRAINT "sticker_categoryId_category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticker" ADD CONSTRAINT "sticker_submittedById_user_id_fk" FOREIGN KEY ("submittedById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticker" ADD CONSTRAINT "sticker_approvedById_user_id_fk" FOREIGN KEY ("approvedById") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_parent_idx" ON "category" USING btree ("parentId");--> statement-breakpoint
CREATE INDEX "sticker_approved_idx" ON "sticker" USING btree ("categoryId") WHERE "sticker"."status" = 'approved';--> statement-breakpoint
CREATE INDEX "sticker_pending_idx" ON "sticker" USING btree ("submittedAt") WHERE "sticker"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "sticker_tags_gin_idx" ON "sticker" USING gin ("tags");--> statement-breakpoint
CREATE UNIQUE INDEX "sticker_hash_active_idx" ON "sticker" USING btree ("hash") WHERE "sticker"."status" <> 'rejected';