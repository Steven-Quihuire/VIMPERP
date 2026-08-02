CREATE TYPE "public"."company_status" AS ENUM('active', 'suspended', 'provisioning_failed');--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"active_company_id" text
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "status" "company_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_active_company_id_companies_id_fk" FOREIGN KEY ("active_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
