CREATE TABLE "divisions" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DROP INDEX "item_categories_company_parent_name_idx";--> statement-breakpoint
DROP INDEX "items_company_sku_idx";--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "division_id" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "local_id" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "division_id" text;--> statement-breakpoint
ALTER TABLE "item_categories" ADD COLUMN "local_id" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "local_id" text;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "division_id" text;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "local_id" text;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "active_local_id" text;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "divisions_company_name_idx" ON "divisions" USING btree ("company_id","name");--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_local_id_idx" ON "audit_events" USING btree ("local_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_categories_company_local_parent_name_idx" ON "item_categories" USING btree ("company_id","local_id","parent_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "items_company_local_sku_idx" ON "items" USING btree ("company_id","local_id","sku") WHERE "items"."sku" IS NOT NULL;