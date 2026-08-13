CREATE TABLE "node_management_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"scope_node_id" text NOT NULL,
	"scope_type" "scope_node_type" NOT NULL,
	"scope_id" text NOT NULL,
	"invitee_email" text NOT NULL,
	"token_hash" text NOT NULL,
	"managed_role_key" text DEFAULT 'node-manager' NOT NULL,
	"base_membership_role" "auth_role" DEFAULT 'company-user' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_user_id" text,
	CONSTRAINT "node_management_invitations_acceptance_chk" CHECK ((("node_management_invitations"."accepted_at" IS NULL AND "node_management_invitations"."accepted_by_user_id" IS NULL) OR ("node_management_invitations"."accepted_at" IS NOT NULL AND "node_management_invitations"."accepted_by_user_id" IS NOT NULL)))
);
--> statement-breakpoint
ALTER TABLE "node_management_invitations" ADD CONSTRAINT "node_management_invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_management_invitations" ADD CONSTRAINT "node_management_invitations_scope_node_id_scope_nodes_id_fk" FOREIGN KEY ("scope_node_id") REFERENCES "public"."scope_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_management_invitations" ADD CONSTRAINT "node_management_invitations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_management_invitations" ADD CONSTRAINT "node_management_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "node_management_invitations_company_idx" ON "node_management_invitations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "node_management_invitations_scope_node_idx" ON "node_management_invitations" USING btree ("scope_node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "node_management_invitations_token_hash_idx" ON "node_management_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "node_management_invitations_invitee_email_idx" ON "node_management_invitations" USING btree ("invitee_email");--> statement-breakpoint
