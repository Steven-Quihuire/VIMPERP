CREATE TABLE "node_responsibilities" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"scope_node_id" text NOT NULL,
	"scope_type" "scope_node_type" NOT NULL,
	"scope_id" text NOT NULL,
	"responsible_user_id" text NOT NULL,
	"managed_role_key" text DEFAULT 'node-manager' NOT NULL,
	"assignment_mode" "role_assignment_mode" DEFAULT 'subtree_inclusive' NOT NULL,
	"base_membership_role" "auth_role" DEFAULT 'company-user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "node_responsibilities" ADD CONSTRAINT "node_responsibilities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_responsibilities" ADD CONSTRAINT "node_responsibilities_scope_node_id_scope_nodes_id_fk" FOREIGN KEY ("scope_node_id") REFERENCES "public"."scope_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_responsibilities" ADD CONSTRAINT "node_responsibilities_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "node_responsibilities_company_idx" ON "node_responsibilities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "node_responsibilities_scope_node_idx" ON "node_responsibilities" USING btree ("scope_node_id");--> statement-breakpoint
CREATE INDEX "node_responsibilities_scope_idx" ON "node_responsibilities" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "node_responsibilities_user_idx" ON "node_responsibilities" USING btree ("responsible_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "node_responsibilities_active_scope_node_idx" ON "node_responsibilities" USING btree ("scope_node_id") WHERE "node_responsibilities"."is_active" = true AND "node_responsibilities"."ended_at" IS NULL;--> statement-breakpoint
