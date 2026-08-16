CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE TYPE "public"."timesheet_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "timesheet_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"employee_assignment_id" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" timesheet_status DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"submitted_by_user_id" text,
	"approved_at" timestamp with time zone,
	"approved_by_user_id" text,
	"rejection_reason" text,
	"approval_policy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timesheet_periods_end_after_start_chk" CHECK ("timesheet_periods"."period_end" >= "timesheet_periods"."period_start"),
	CONSTRAINT "timesheet_periods_submission_pair_chk" CHECK (("timesheet_periods"."submitted_at" IS NULL AND "timesheet_periods"."submitted_by_user_id" IS NULL) OR ("timesheet_periods"."submitted_at" IS NOT NULL AND "timesheet_periods"."submitted_by_user_id" IS NOT NULL)),
	CONSTRAINT "timesheet_periods_approval_pair_chk" CHECK (("timesheet_periods"."approved_at" IS NULL AND "timesheet_periods"."approved_by_user_id" IS NULL) OR ("timesheet_periods"."approved_at" IS NOT NULL AND "timesheet_periods"."approved_by_user_id" IS NOT NULL))
);--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"period_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"project_id" uuid,
	"task_label" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_entries_hours_bounds_chk" CHECK ("time_entries"."hours" > 0 AND "time_entries"."hours" <= 24)
);--> statement-breakpoint
ALTER TABLE "timesheet_periods" ADD CONSTRAINT "timesheet_periods_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_periods" ADD CONSTRAINT "timesheet_periods_employee_assignment_id_employee_assignments_id_fk" FOREIGN KEY ("employee_assignment_id") REFERENCES "public"."employee_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_periods" ADD CONSTRAINT "timesheet_periods_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_periods" ADD CONSTRAINT "timesheet_periods_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_periods" ADD CONSTRAINT "timesheet_periods_approval_policy_id_approval_policies_id_fk" FOREIGN KEY ("approval_policy_id") REFERENCES "public"."approval_policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_period_id_timesheet_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."timesheet_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employee_assignments_id_company_idx" ON "employee_assignments" USING btree ("id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_policies_id_company_idx" ON "approval_policies" USING btree ("id","company_id");--> statement-breakpoint
ALTER TABLE "timesheet_periods" ADD CONSTRAINT "timesheet_periods_employee_assignment_company_fk" FOREIGN KEY ("employee_assignment_id","company_id") REFERENCES "public"."employee_assignments"("id","company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_periods" ADD CONSTRAINT "timesheet_periods_approval_policy_company_fk" FOREIGN KEY ("approval_policy_id","company_id") REFERENCES "public"."approval_policies"("id","company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "timesheet_periods_id_company_idx" ON "timesheet_periods" USING btree ("id","company_id");--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_period_company_fk" FOREIGN KEY ("period_id","company_id") REFERENCES "public"."timesheet_periods"("id","company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "timesheet_periods_company_idx" ON "timesheet_periods" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "timesheet_periods_assignment_idx" ON "timesheet_periods" USING btree ("employee_assignment_id");--> statement-breakpoint
CREATE INDEX "timesheet_periods_status_idx" ON "timesheet_periods" USING btree ("company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "time_entries_id_company_idx" ON "time_entries" USING btree ("id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "time_entries_period_date_task_idx" ON "time_entries" USING btree ("period_id","entry_date","task_label");--> statement-breakpoint
CREATE INDEX "time_entries_company_idx" ON "time_entries" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "time_entries_period_idx" ON "time_entries" USING btree ("period_id");--> statement-breakpoint
ALTER TABLE "timesheet_periods"
	ADD CONSTRAINT "timesheet_periods_no_overlap_excl"
	EXCLUDE USING gist (
		"employee_assignment_id" WITH =,
		daterange("period_start", "period_end", '[)') WITH &&
	);--> statement-breakpoint
