CREATE TABLE "hr_responsibility_invitations" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL,
  "invitee_email" text NOT NULL,
  "token_hash" text NOT NULL,
  "purpose" text DEFAULT 'hr-responsible' NOT NULL,
  "role_key" text DEFAULT 'hr-responsible' NOT NULL,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "accepted_by_user_id" text,
  CONSTRAINT "hr_responsibility_invitations_purpose_chk" CHECK ("hr_responsibility_invitations"."purpose" = 'hr-responsible' AND "hr_responsibility_invitations"."role_key" = 'hr-responsible'),
  CONSTRAINT "hr_responsibility_invitations_acceptance_chk" CHECK (("hr_responsibility_invitations"."accepted_at" IS NULL AND "hr_responsibility_invitations"."accepted_by_user_id" IS NULL) OR ("hr_responsibility_invitations"."accepted_at" IS NOT NULL AND "hr_responsibility_invitations"."accepted_by_user_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "hr_responsibility_invitations" ADD CONSTRAINT "hr_responsibility_invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_responsibility_invitations" ADD CONSTRAINT "hr_responsibility_invitations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_responsibility_invitations" ADD CONSTRAINT "hr_responsibility_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hr_responsibility_invitations_company_idx" ON "hr_responsibility_invitations" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "hr_responsibility_invitations_email_idx" ON "hr_responsibility_invitations" USING btree ("invitee_email");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_responsibility_invitations_token_hash_idx" ON "hr_responsibility_invitations" USING btree ("token_hash");
