ALTER TYPE "public"."scope_node_type" RENAME VALUE 'branch' TO 'local';--> statement-breakpoint
ALTER TABLE "branches" RENAME TO "locals";--> statement-breakpoint
ALTER TABLE "locals" RENAME CONSTRAINT "branches_pkey" TO "locals_pkey";--> statement-breakpoint
ALTER TABLE "locals" DROP CONSTRAINT "branches_division_id_divisions_id_fk";--> statement-breakpoint
ALTER TABLE "areas" DROP CONSTRAINT "areas_local_id_branches_id_fk";--> statement-breakpoint
ALTER TABLE "points_of_sale" DROP CONSTRAINT "points_of_sale_local_id_branches_id_fk";--> statement-breakpoint
ALTER TABLE "warehouses" DROP CONSTRAINT "warehouses_local_id_branches_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "areas_company_local_kind_name_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "warehouses_company_local_name_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "points_of_sale_company_local_name_idx";--> statement-breakpoint
CREATE TABLE "scope_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"node_type" "scope_node_type" NOT NULL,
	"source_id" text NOT NULL,
	"company_id" text NOT NULL,
	"parent_scope_node_id" text,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "locals" ADD CONSTRAINT "locals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locals" ADD CONSTRAINT "locals_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_of_sale" ADD CONSTRAINT "points_of_sale_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_nodes" ADD CONSTRAINT "scope_nodes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_nodes" ADD CONSTRAINT "scope_nodes_parent_scope_node_id_scope_nodes_id_fk" FOREIGN KEY ("parent_scope_node_id") REFERENCES "public"."scope_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_exactly_one_parent_check" CHECK ((("division_id" IS NOT NULL AND "local_id" IS NULL) OR ("division_id" IS NULL AND "local_id" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_exactly_one_parent_check" CHECK ((("area_id" IS NOT NULL AND "local_id" IS NULL) OR ("area_id" IS NULL AND "local_id" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "points_of_sale" ADD CONSTRAINT "points_of_sale_exactly_one_parent_check" CHECK ((("area_id" IS NOT NULL AND "local_id" IS NULL) OR ("area_id" IS NULL AND "local_id" IS NOT NULL)));--> statement-breakpoint
CREATE UNIQUE INDEX "locals_company_name_root_idx" ON "locals" USING btree ("company_id", "name") WHERE "locals"."division_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "locals_division_name_idx" ON "locals" USING btree ("division_id", "name") WHERE "locals"."division_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "locals_company_idx" ON "locals" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "locals_division_idx" ON "locals" USING btree ("division_id");--> statement-breakpoint
CREATE UNIQUE INDEX "areas_company_division_kind_name_idx" ON "areas" USING btree ("company_id", "division_id", "kind", "name") WHERE "areas"."division_id" IS NOT NULL AND "areas"."local_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "areas_company_local_kind_name_idx" ON "areas" USING btree ("company_id", "local_id", "kind", "name") WHERE "areas"."local_id" IS NOT NULL AND "areas"."division_id" IS NULL;--> statement-breakpoint
CREATE INDEX "areas_division_idx" ON "areas" USING btree ("division_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_company_area_name_idx" ON "warehouses" USING btree ("company_id", "area_id", "name") WHERE "warehouses"."area_id" IS NOT NULL AND "warehouses"."local_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_company_local_name_idx" ON "warehouses" USING btree ("company_id", "local_id", "name") WHERE "warehouses"."local_id" IS NOT NULL AND "warehouses"."area_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "points_of_sale_company_area_name_idx" ON "points_of_sale" USING btree ("company_id", "area_id", "name") WHERE "points_of_sale"."area_id" IS NOT NULL AND "points_of_sale"."local_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "points_of_sale_company_local_name_idx" ON "points_of_sale" USING btree ("company_id", "local_id", "name") WHERE "points_of_sale"."local_id" IS NOT NULL AND "points_of_sale"."area_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "scope_nodes_node_source_idx" ON "scope_nodes" USING btree ("node_type", "source_id");--> statement-breakpoint
CREATE INDEX "scope_nodes_company_idx" ON "scope_nodes" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "scope_nodes_parent_scope_node_idx" ON "scope_nodes" USING btree ("parent_scope_node_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sync_scope_node_company"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM "scope_nodes" WHERE "node_type" = 'company' AND "source_id" = OLD."id";
    RETURN OLD;
  END IF;

  INSERT INTO "scope_nodes" (
    "id",
    "node_type",
    "source_id",
    "company_id",
    "parent_scope_node_id",
    "name",
    "created_at"
  ) VALUES (
    'company:' || NEW."id",
    'company',
    NEW."id",
    NEW."id",
    NULL,
    NEW."name",
    NEW."created_at"
  )
  ON CONFLICT ("node_type", "source_id") DO UPDATE SET
    "company_id" = EXCLUDED."company_id",
    "parent_scope_node_id" = EXCLUDED."parent_scope_node_id",
    "name" = EXCLUDED."name",
    "created_at" = EXCLUDED."created_at";

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sync_scope_node_division"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM "scope_nodes" WHERE "node_type" = 'division' AND "source_id" = OLD."id";
    RETURN OLD;
  END IF;

  INSERT INTO "scope_nodes" (
    "id",
    "node_type",
    "source_id",
    "company_id",
    "parent_scope_node_id",
    "name",
    "created_at"
  ) VALUES (
    'division:' || NEW."id",
    'division',
    NEW."id",
    NEW."company_id",
    'company:' || NEW."company_id",
    NEW."name",
    NEW."created_at"
  )
  ON CONFLICT ("node_type", "source_id") DO UPDATE SET
    "company_id" = EXCLUDED."company_id",
    "parent_scope_node_id" = EXCLUDED."parent_scope_node_id",
    "name" = EXCLUDED."name",
    "created_at" = EXCLUDED."created_at";

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sync_scope_node_local"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM "scope_nodes" WHERE "node_type" = 'local' AND "source_id" = OLD."id";
    RETURN OLD;
  END IF;

  INSERT INTO "scope_nodes" (
    "id",
    "node_type",
    "source_id",
    "company_id",
    "parent_scope_node_id",
    "name"
  ) VALUES (
    'local:' || NEW."id",
    'local',
    NEW."id",
    NEW."company_id",
    CASE
      WHEN NEW."division_id" IS NOT NULL THEN 'division:' || NEW."division_id"
      ELSE 'company:' || NEW."company_id"
    END,
    NEW."name"
  )
  ON CONFLICT ("node_type", "source_id") DO UPDATE SET
    "company_id" = EXCLUDED."company_id",
    "parent_scope_node_id" = EXCLUDED."parent_scope_node_id",
    "name" = EXCLUDED."name";

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sync_scope_node_area"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM "scope_nodes" WHERE "node_type" = 'area' AND "source_id" = OLD."id";
    RETURN OLD;
  END IF;

  INSERT INTO "scope_nodes" (
    "id",
    "node_type",
    "source_id",
    "company_id",
    "parent_scope_node_id",
    "name",
    "created_at"
  ) VALUES (
    'area:' || NEW."id",
    'area',
    NEW."id",
    NEW."company_id",
    CASE
      WHEN NEW."local_id" IS NOT NULL THEN 'local:' || NEW."local_id"
      ELSE 'division:' || NEW."division_id"
    END,
    NEW."name",
    NEW."created_at"
  )
  ON CONFLICT ("node_type", "source_id") DO UPDATE SET
    "company_id" = EXCLUDED."company_id",
    "parent_scope_node_id" = EXCLUDED."parent_scope_node_id",
    "name" = EXCLUDED."name",
    "created_at" = EXCLUDED."created_at";

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sync_scope_node_warehouse"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM "scope_nodes" WHERE "node_type" = 'warehouse' AND "source_id" = OLD."id";
    RETURN OLD;
  END IF;

  INSERT INTO "scope_nodes" (
    "id",
    "node_type",
    "source_id",
    "company_id",
    "parent_scope_node_id",
    "name",
    "created_at"
  ) VALUES (
    'warehouse:' || NEW."id",
    'warehouse',
    NEW."id",
    NEW."company_id",
    CASE
      WHEN NEW."area_id" IS NOT NULL THEN 'area:' || NEW."area_id"
      ELSE 'local:' || NEW."local_id"
    END,
    NEW."name",
    NEW."created_at"
  )
  ON CONFLICT ("node_type", "source_id") DO UPDATE SET
    "company_id" = EXCLUDED."company_id",
    "parent_scope_node_id" = EXCLUDED."parent_scope_node_id",
    "name" = EXCLUDED."name",
    "created_at" = EXCLUDED."created_at";

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sync_scope_node_point_of_sale"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM "scope_nodes" WHERE "node_type" = 'point-of-sale' AND "source_id" = OLD."id";
    RETURN OLD;
  END IF;

  INSERT INTO "scope_nodes" (
    "id",
    "node_type",
    "source_id",
    "company_id",
    "parent_scope_node_id",
    "name",
    "created_at"
  ) VALUES (
    'point-of-sale:' || NEW."id",
    'point-of-sale',
    NEW."id",
    NEW."company_id",
    CASE
      WHEN NEW."area_id" IS NOT NULL THEN 'area:' || NEW."area_id"
      ELSE 'local:' || NEW."local_id"
    END,
    NEW."name",
    NEW."created_at"
  )
  ON CONFLICT ("node_type", "source_id") DO UPDATE SET
    "company_id" = EXCLUDED."company_id",
    "parent_scope_node_id" = EXCLUDED."parent_scope_node_id",
    "name" = EXCLUDED."name",
    "created_at" = EXCLUDED."created_at";

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "sync_scope_node_company_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "companies"
FOR EACH ROW EXECUTE FUNCTION "sync_scope_node_company"();--> statement-breakpoint
CREATE TRIGGER "sync_scope_node_division_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "divisions"
FOR EACH ROW EXECUTE FUNCTION "sync_scope_node_division"();--> statement-breakpoint
CREATE TRIGGER "sync_scope_node_local_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "locals"
FOR EACH ROW EXECUTE FUNCTION "sync_scope_node_local"();--> statement-breakpoint
CREATE TRIGGER "sync_scope_node_area_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "areas"
FOR EACH ROW EXECUTE FUNCTION "sync_scope_node_area"();--> statement-breakpoint
CREATE TRIGGER "sync_scope_node_warehouse_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "warehouses"
FOR EACH ROW EXECUTE FUNCTION "sync_scope_node_warehouse"();--> statement-breakpoint
CREATE TRIGGER "sync_scope_node_point_of_sale_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "points_of_sale"
FOR EACH ROW EXECUTE FUNCTION "sync_scope_node_point_of_sale"();--> statement-breakpoint
INSERT INTO "scope_nodes" ("id", "node_type", "source_id", "company_id", "parent_scope_node_id", "name", "created_at")
SELECT 'company:' || "id", 'company', "id", "id", NULL, "name", "created_at"
FROM "companies";--> statement-breakpoint
INSERT INTO "scope_nodes" ("id", "node_type", "source_id", "company_id", "parent_scope_node_id", "name", "created_at")
SELECT 'division:' || "id", 'division', "id", "company_id", 'company:' || "company_id", "name", "created_at"
FROM "divisions";--> statement-breakpoint
INSERT INTO "scope_nodes" ("id", "node_type", "source_id", "company_id", "parent_scope_node_id", "name", "created_at")
SELECT
	'local:' || "id",
	'local',
	"id",
	"company_id",
	CASE WHEN "division_id" IS NOT NULL THEN 'division:' || "division_id" ELSE 'company:' || "company_id" END,
	"name",
	now()
FROM "locals";--> statement-breakpoint
INSERT INTO "scope_nodes" ("id", "node_type", "source_id", "company_id", "parent_scope_node_id", "name", "created_at")
SELECT
	'area:' || "id",
	'area',
	"id",
	"company_id",
	CASE WHEN "local_id" IS NOT NULL THEN 'local:' || "local_id" ELSE 'division:' || "division_id" END,
	"name",
	"created_at"
FROM "areas";--> statement-breakpoint
INSERT INTO "scope_nodes" ("id", "node_type", "source_id", "company_id", "parent_scope_node_id", "name", "created_at")
SELECT
	'warehouse:' || "id",
	'warehouse',
	"id",
	"company_id",
	CASE WHEN "area_id" IS NOT NULL THEN 'area:' || "area_id" ELSE 'local:' || "local_id" END,
	"name",
	"created_at"
FROM "warehouses";--> statement-breakpoint
INSERT INTO "scope_nodes" ("id", "node_type", "source_id", "company_id", "parent_scope_node_id", "name", "created_at")
SELECT
	'point-of-sale:' || "id",
	'point-of-sale',
	"id",
	"company_id",
	CASE WHEN "area_id" IS NOT NULL THEN 'area:' || "area_id" ELSE 'local:' || "local_id" END,
	"name",
	"created_at"
FROM "points_of_sale";--> statement-breakpoint
