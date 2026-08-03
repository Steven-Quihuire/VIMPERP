CREATE TABLE "privacy_consents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company_id" text NOT NULL,
	"policy_version" text NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_consents_user_company_version_idx" ON "privacy_consents" USING btree ("user_id","company_id","policy_version");