CREATE UNIQUE INDEX "divisions_id_company_idx" ON "divisions" USING btree ("id", "company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locals_id_company_idx" ON "locals" USING btree ("id", "company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "areas_id_company_idx" ON "areas" USING btree ("id", "company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_id_company_idx" ON "warehouses" USING btree ("id", "company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "points_of_sale_id_company_idx" ON "points_of_sale" USING btree ("id", "company_id");--> statement-breakpoint
ALTER TABLE "locals" ADD CONSTRAINT "locals_division_company_fk" FOREIGN KEY ("division_id","company_id") REFERENCES "public"."divisions"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_division_company_fk" FOREIGN KEY ("division_id","company_id") REFERENCES "public"."divisions"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_local_company_fk" FOREIGN KEY ("local_id","company_id") REFERENCES "public"."locals"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_area_company_fk" FOREIGN KEY ("area_id","company_id") REFERENCES "public"."areas"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_local_company_fk" FOREIGN KEY ("local_id","company_id") REFERENCES "public"."locals"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_of_sale" ADD CONSTRAINT "points_of_sale_area_company_fk" FOREIGN KEY ("area_id","company_id") REFERENCES "public"."areas"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_of_sale" ADD CONSTRAINT "points_of_sale_local_company_fk" FOREIGN KEY ("local_id","company_id") REFERENCES "public"."locals"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
