CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text NOT NULL,
	"company_id" text NOT NULL,
	"type" text NOT NULL,
	"details" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"locale" text
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_profiles" (
	"company_id" text PRIMARY KEY NOT NULL,
	"legal_identifier" text NOT NULL,
	"services" text NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"exact_location" text NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_email" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"target_role" "auth_role" NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "theme_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"palette_id" text NOT NULL
);
