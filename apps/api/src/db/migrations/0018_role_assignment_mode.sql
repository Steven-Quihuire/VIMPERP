CREATE TYPE "role_assignment_mode" AS ENUM ('subtree_inclusive', 'exact_node');--> statement-breakpoint
ALTER TABLE "role_assignments"
ADD COLUMN "mode" "role_assignment_mode" NOT NULL DEFAULT 'subtree_inclusive';--> statement-breakpoint
ALTER TABLE "user_preferences"
ADD COLUMN "active_scope_node_id" text;--> statement-breakpoint
ALTER TABLE "user_preferences"
ADD CONSTRAINT "user_preferences_active_scope_node_id_scope_nodes_id_fk"
FOREIGN KEY ("active_scope_node_id") REFERENCES "public"."scope_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
