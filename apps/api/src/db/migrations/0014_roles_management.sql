CREATE TYPE "public"."permission_family" AS ENUM('normal', 'reserved');--> statement-breakpoint
CREATE TYPE "public"."scope_node_type" AS ENUM('company', 'division', 'branch', 'area', 'warehouse', 'point-of-sale');--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"family" "permission_family" NOT NULL
);--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "role_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"scope_type" "scope_node_type" NOT NULL,
	"scope_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_key_unique" UNIQUE("key");--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "roles_company_key_idx" ON "roles" USING btree ("company_id", "key");--> statement-breakpoint
CREATE INDEX "roles_company_idx" ON "roles" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_permission_idx" ON "role_permissions" USING btree ("role_id", "permission_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "role_assignments_user_company_idx" ON "role_assignments" USING btree ("user_id", "company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_assignments_unique_company_scope_idx" ON "role_assignments" USING btree ("company_id", "user_id", "role_id", "scope_type", "scope_id");
