CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"reports_to_position_id" text,
	"headcount" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "positions_headcount_nonnegative_chk" CHECK ("positions"."headcount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "employee_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"scope_node_id" text NOT NULL,
	"position_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp_access_links" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"user_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "erp_access_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"invitee_email" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_user_id" text,
	CONSTRAINT "erp_access_invitations_acceptance_chk" CHECK (("erp_access_invitations"."accepted_at" IS NULL AND "erp_access_invitations"."accepted_by_user_id" IS NULL) OR ("erp_access_invitations"."accepted_at" IS NOT NULL AND "erp_access_invitations"."accepted_by_user_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "approval_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"scope_type" "scope_node_type" NOT NULL,
	"scope_node_id" text,
	"name" text NOT NULL,
	"definition" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_policies_scope_company_chk" CHECK (("approval_policies"."scope_type" <> 'company') OR ("approval_policies"."scope_node_id" IS NULL)),
	CONSTRAINT "approval_policies_scope_node_required_chk" CHECK (("approval_policies"."scope_type" = 'company') OR ("approval_policies"."scope_node_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_reports_to_position_id_positions_id_fk" FOREIGN KEY ("reports_to_position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_assignments" ADD CONSTRAINT "employee_assignments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_assignments" ADD CONSTRAINT "employee_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_assignments" ADD CONSTRAINT "employee_assignments_scope_node_id_scope_nodes_id_fk" FOREIGN KEY ("scope_node_id") REFERENCES "public"."scope_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_assignments" ADD CONSTRAINT "employee_assignments_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_access_links" ADD CONSTRAINT "erp_access_links_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_access_links" ADD CONSTRAINT "erp_access_links_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_access_links" ADD CONSTRAINT "erp_access_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_access_invitations" ADD CONSTRAINT "erp_access_invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_access_invitations" ADD CONSTRAINT "erp_access_invitations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_access_invitations" ADD CONSTRAINT "erp_access_invitations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp_access_invitations" ADD CONSTRAINT "erp_access_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_scope_node_id_scope_nodes_id_fk" FOREIGN KEY ("scope_node_id") REFERENCES "public"."scope_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_company_idx" ON "employees" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "positions_company_idx" ON "positions" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "positions_company_name_idx" ON "positions" USING btree ("company_id", "name");--> statement-breakpoint
CREATE INDEX "positions_reports_to_position_idx" ON "positions" USING btree ("reports_to_position_id");--> statement-breakpoint
CREATE INDEX "employee_assignments_company_idx" ON "employee_assignments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "employee_assignments_employee_idx" ON "employee_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_assignments_scope_node_idx" ON "employee_assignments" USING btree ("scope_node_id");--> statement-breakpoint
CREATE INDEX "employee_assignments_position_idx" ON "employee_assignments" USING btree ("position_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_assignments_active_primary_idx" ON "employee_assignments" USING btree ("employee_id") WHERE "employee_assignments"."ended_at" IS NULL AND "employee_assignments"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "erp_access_links_company_idx" ON "erp_access_links" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "erp_access_links_active_employee_idx" ON "erp_access_links" USING btree ("employee_id", "company_id") WHERE "erp_access_links"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "erp_access_links_active_user_idx" ON "erp_access_links" USING btree ("user_id", "company_id") WHERE "erp_access_links"."is_active" = true;--> statement-breakpoint
CREATE INDEX "erp_access_invitations_company_idx" ON "erp_access_invitations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "erp_access_invitations_employee_idx" ON "erp_access_invitations" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "erp_access_invitations_token_hash_idx" ON "erp_access_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "erp_access_invitations_invitee_email_idx" ON "erp_access_invitations" USING btree ("invitee_email");--> statement-breakpoint
CREATE INDEX "approval_policies_company_idx" ON "approval_policies" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "approval_policies_scope_node_idx" ON "approval_policies" USING btree ("scope_node_id");--> statement-breakpoint
