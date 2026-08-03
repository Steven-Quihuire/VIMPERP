CREATE TABLE "privacy_policy_acceptances" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"policy_version" text NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_policy_acceptances_user_version_idx" ON "privacy_policy_acceptances" USING btree ("user_id","policy_version");