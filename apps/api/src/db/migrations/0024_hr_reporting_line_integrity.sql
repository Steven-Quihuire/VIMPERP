ALTER TABLE "positions" DROP CONSTRAINT "positions_reports_to_position_id_positions_id_fk";
ALTER TABLE "employee_assignments" DROP CONSTRAINT "employee_assignments_employee_id_employees_id_fk";
ALTER TABLE "employee_assignments" DROP CONSTRAINT "employee_assignments_scope_node_id_scope_nodes_id_fk";
ALTER TABLE "employee_assignments" DROP CONSTRAINT "employee_assignments_position_id_positions_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "scope_nodes_id_company_idx" ON "scope_nodes" USING btree ("id", "company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_id_company_idx" ON "employees" USING btree ("id", "company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "positions_id_company_idx" ON "positions" USING btree ("id", "company_id");--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_reports_to_company_fk" FOREIGN KEY ("reports_to_position_id", "company_id") REFERENCES "public"."positions"("id", "company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_assignments" ADD CONSTRAINT "employee_assignments_employee_company_fk" FOREIGN KEY ("employee_id", "company_id") REFERENCES "public"."employees"("id", "company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_assignments" ADD CONSTRAINT "employee_assignments_scope_node_company_fk" FOREIGN KEY ("scope_node_id", "company_id") REFERENCES "public"."scope_nodes"("id", "company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_assignments" ADD CONSTRAINT "employee_assignments_position_company_fk" FOREIGN KEY ("position_id", "company_id") REFERENCES "public"."positions"("id", "company_id") ON DELETE restrict ON UPDATE no action;
