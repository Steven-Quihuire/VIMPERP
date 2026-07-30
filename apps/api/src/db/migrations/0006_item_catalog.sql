CREATE TYPE "public"."item_track_batch_mode" AS ENUM('none', 'batch', 'serial');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('product', 'service');--> statement-breakpoint
CREATE TYPE "public"."item_unit" AS ENUM('unit', 'hour', 'kg', 'liter', 'meter', 'box', 'service');--> statement-breakpoint
CREATE TABLE "item_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"category_id" uuid,
	"sku" text,
	"name" text NOT NULL,
	"type" "item_type" DEFAULT 'product' NOT NULL,
	"unit" "item_unit" DEFAULT 'unit' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tracks_stock" boolean DEFAULT false NOT NULL,
	"track_batch_mode" "item_track_batch_mode" DEFAULT 'none' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_parent_id_item_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."item_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_item_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."item_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "item_categories_company_parent_name_idx" ON "item_categories" USING btree ("company_id","parent_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "items_company_sku_idx" ON "items" USING btree ("company_id","sku") WHERE "items"."sku" IS NOT NULL;
