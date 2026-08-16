CREATE TYPE "public"."stock_document_type" AS ENUM('receipt', 'transfer', 'adjustment', 'loss');--> statement-breakpoint
CREATE TYPE "public"."stock_document_status" AS ENUM('draft', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TABLE "stock_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"lot_number" text NOT NULL,
	"expires_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "stock_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"document_no" text NOT NULL,
	"type" "stock_document_type" NOT NULL,
	"status" "stock_document_status" DEFAULT 'draft' NOT NULL,
	"origin_scope_node_id" text,
	"origin_scope_type" text,
	"destination_scope_node_id" text,
	"destination_scope_type" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_by_user_id" text NOT NULL,
	"reversal_of_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_documents_origin_scope_type_warehouse_pos_chk" CHECK ("stock_documents"."origin_scope_type" IS NULL OR "stock_documents"."origin_scope_type" IN ('warehouse', 'point-of-sale')),
	CONSTRAINT "stock_documents_destination_scope_type_warehouse_pos_chk" CHECK ("stock_documents"."destination_scope_type" IS NULL OR "stock_documents"."destination_scope_type" IN ('warehouse', 'point-of-sale')),
	CONSTRAINT "stock_documents_origin_scope_pair_chk" CHECK (("stock_documents"."origin_scope_node_id" IS NULL AND "stock_documents"."origin_scope_type" IS NULL) OR ("stock_documents"."origin_scope_node_id" IS NOT NULL AND "stock_documents"."origin_scope_type" IS NOT NULL)),
	CONSTRAINT "stock_documents_destination_scope_pair_chk" CHECK (("stock_documents"."destination_scope_node_id" IS NULL AND "stock_documents"."destination_scope_type" IS NULL) OR ("stock_documents"."destination_scope_node_id" IS NOT NULL AND "stock_documents"."destination_scope_type" IS NOT NULL)),
	CONSTRAINT "stock_documents_reversal_confirmed_chk" CHECK ("stock_documents"."reversal_of_id" IS NULL OR "stock_documents"."status" = 'confirmed'),
	CONSTRAINT "stock_documents_receipt_shape_chk" CHECK ("stock_documents"."type" <> 'receipt' OR ("stock_documents"."origin_scope_node_id" IS NULL AND "stock_documents"."destination_scope_node_id" IS NOT NULL)),
	CONSTRAINT "stock_documents_loss_adjustment_shape_chk" CHECK ("stock_documents"."type" NOT IN ('loss', 'adjustment') OR ("stock_documents"."origin_scope_node_id" IS NOT NULL AND "stock_documents"."destination_scope_node_id" IS NULL)),
	CONSTRAINT "stock_documents_transfer_shape_chk" CHECK ("stock_documents"."type" <> 'transfer' OR ("stock_documents"."origin_scope_node_id" IS NOT NULL AND "stock_documents"."destination_scope_node_id" IS NOT NULL AND "stock_documents"."origin_scope_node_id" <> "stock_documents"."destination_scope_node_id"))
);--> statement-breakpoint
CREATE TABLE "stock_document_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"document_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"unit_cost" numeric(14, 4),
	"lot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_document_lines_quantity_positive_chk" CHECK ("stock_document_lines"."quantity" > (0)::numeric)
);--> statement-breakpoint
CREATE TABLE "stock_quants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"scope_node_id" text NOT NULL,
	"scope_type" text NOT NULL,
	"lot_id" uuid,
	"quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"reserved_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"quarantine_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"avg_unit_cost" numeric(14, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_quants_scope_type_warehouse_pos_chk" CHECK ("stock_quants"."scope_type" IN ('warehouse', 'point-of-sale')),
	CONSTRAINT "stock_quants_quantity_nonnegative_chk" CHECK ("stock_quants"."quantity" >= (0)::numeric),
	CONSTRAINT "stock_quants_reserved_nonnegative_chk" CHECK ("stock_quants"."reserved_quantity" >= (0)::numeric),
	CONSTRAINT "stock_quants_quarantine_nonnegative_chk" CHECK ("stock_quants"."quarantine_quantity" >= (0)::numeric),
	CONSTRAINT "stock_quants_reserved_quarantine_within_quantity_chk" CHECK ("stock_quants"."reserved_quantity" + "stock_quants"."quarantine_quantity" <= "stock_quants"."quantity")
);--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_origin_scope_node_id_scope_nodes_id_fk" FOREIGN KEY ("origin_scope_node_id") REFERENCES "public"."scope_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_destination_scope_node_id_scope_nodes_id_fk" FOREIGN KEY ("destination_scope_node_id") REFERENCES "public"."scope_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_reversal_of_id_stock_documents_id_fk" FOREIGN KEY ("reversal_of_id") REFERENCES "public"."stock_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_document_id_stock_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."stock_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_lot_id_stock_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."stock_lots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_quants" ADD CONSTRAINT "stock_quants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_quants" ADD CONSTRAINT "stock_quants_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_quants" ADD CONSTRAINT "stock_quants_scope_node_id_scope_nodes_id_fk" FOREIGN KEY ("scope_node_id") REFERENCES "public"."scope_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_quants" ADD CONSTRAINT "stock_quants_lot_id_stock_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."stock_lots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "items_id_company_idx" ON "items" USING btree ("id", "company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_lots_id_company_idx" ON "stock_lots" USING btree ("id", "company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_lots_company_item_lot_idx" ON "stock_lots" USING btree ("company_id", "item_id", "lot_number");--> statement-breakpoint
CREATE INDEX "stock_lots_item_idx" ON "stock_lots" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "stock_lots_expires_at_idx" ON "stock_lots" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_documents_id_company_idx" ON "stock_documents" USING btree ("id", "company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_documents_company_document_no_idx" ON "stock_documents" USING btree ("company_id", "document_no");--> statement-breakpoint
CREATE INDEX "stock_documents_company_idx" ON "stock_documents" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "stock_documents_type_status_idx" ON "stock_documents" USING btree ("company_id", "type", "status");--> statement-breakpoint
CREATE INDEX "stock_documents_origin_scope_idx" ON "stock_documents" USING btree ("origin_scope_node_id");--> statement-breakpoint
CREATE INDEX "stock_documents_destination_scope_idx" ON "stock_documents" USING btree ("destination_scope_node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_document_lines_id_company_idx" ON "stock_document_lines" USING btree ("id", "company_id");--> statement-breakpoint
CREATE INDEX "stock_document_lines_document_idx" ON "stock_document_lines" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "stock_document_lines_item_idx" ON "stock_document_lines" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_quants_id_company_idx" ON "stock_quants" USING btree ("id", "company_id");--> statement-breakpoint
CREATE INDEX "stock_quants_company_item_scope_idx" ON "stock_quants" USING btree ("company_id", "item_id", "scope_node_id");--> statement-breakpoint
CREATE INDEX "stock_quants_scope_node_idx" ON "stock_quants" USING btree ("scope_node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_quants_company_item_scope_lot_uk" ON "stock_quants" USING btree ("company_id", "item_id", "scope_node_id", "lot_id") NULLS NOT DISTINCT;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_item_company_fk" FOREIGN KEY ("item_id", "company_id") REFERENCES "public"."items"("id", "company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_origin_scope_node_company_fk" FOREIGN KEY ("origin_scope_node_id", "company_id") REFERENCES "public"."scope_nodes"("id", "company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_destination_scope_node_company_fk" FOREIGN KEY ("destination_scope_node_id", "company_id") REFERENCES "public"."scope_nodes"("id", "company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_reversal_company_fk" FOREIGN KEY ("reversal_of_id", "company_id") REFERENCES "public"."stock_documents"("id", "company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_document_company_fk" FOREIGN KEY ("document_id", "company_id") REFERENCES "public"."stock_documents"("id", "company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_item_company_fk" FOREIGN KEY ("item_id", "company_id") REFERENCES "public"."items"("id", "company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_lot_company_fk" FOREIGN KEY ("lot_id", "company_id") REFERENCES "public"."stock_lots"("id", "company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_quants" ADD CONSTRAINT "stock_quants_item_company_fk" FOREIGN KEY ("item_id", "company_id") REFERENCES "public"."items"("id", "company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_quants" ADD CONSTRAINT "stock_quants_scope_node_company_fk" FOREIGN KEY ("scope_node_id", "company_id") REFERENCES "public"."scope_nodes"("id", "company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_quants" ADD CONSTRAINT "stock_quants_lot_company_fk" FOREIGN KEY ("lot_id", "company_id") REFERENCES "public"."stock_lots"("id", "company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "stock_documents_scope_type_check"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  origin_node_type text;
  destination_node_type text;
BEGIN
  IF NEW."origin_scope_node_id" IS NOT NULL THEN
    SELECT "node_type"
      INTO origin_node_type
      FROM "scope_nodes"
     WHERE "id" = NEW."origin_scope_node_id"
       AND "company_id" = NEW."company_id";

    IF origin_node_type IS NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'stock_documents_origin_scope_node_missing', ERRCODE = '23503';
    END IF;

    IF origin_node_type IS DISTINCT FROM NEW."origin_scope_type" THEN
      RAISE EXCEPTION USING MESSAGE = 'stock_documents_origin_scope_type_mismatch', ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW."destination_scope_node_id" IS NOT NULL THEN
    SELECT "node_type"
      INTO destination_node_type
      FROM "scope_nodes"
     WHERE "id" = NEW."destination_scope_node_id"
       AND "company_id" = NEW."company_id";

    IF destination_node_type IS NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'stock_documents_destination_scope_node_missing', ERRCODE = '23503';
    END IF;

    IF destination_node_type IS DISTINCT FROM NEW."destination_scope_type" THEN
      RAISE EXCEPTION USING MESSAGE = 'stock_documents_destination_scope_type_mismatch', ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "stock_documents_scope_type_check_trg"
BEFORE INSERT OR UPDATE ON "stock_documents"
FOR EACH ROW EXECUTE FUNCTION "stock_documents_scope_type_check"();--> statement-breakpoint
CREATE OR REPLACE FUNCTION "stock_quants_scope_type_check"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  quant_node_type text;
BEGIN
  SELECT "node_type"
    INTO quant_node_type
    FROM "scope_nodes"
   WHERE "id" = NEW."scope_node_id"
     AND "company_id" = NEW."company_id";

  IF quant_node_type IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'stock_quants_scope_node_missing', ERRCODE = '23503';
  END IF;

  IF quant_node_type IS DISTINCT FROM NEW."scope_type" THEN
    RAISE EXCEPTION USING MESSAGE = 'stock_quants_scope_type_mismatch', ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "stock_quants_scope_type_check_trg"
BEFORE INSERT OR UPDATE ON "stock_quants"
FOR EACH ROW EXECUTE FUNCTION "stock_quants_scope_type_check"();--> statement-breakpoint
