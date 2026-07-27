CREATE TYPE "public"."auth_role" AS ENUM('platform-admin', 'company-owner', 'company-user');--> statement-breakpoint
CREATE TABLE "memberships" (
	"user_id" text NOT NULL,
	"company_id" text,
	"role" "auth_role" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
