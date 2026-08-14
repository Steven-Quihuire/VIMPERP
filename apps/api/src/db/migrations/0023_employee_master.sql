ALTER TABLE "employees" ADD COLUMN "full_name" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "document_type" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "document_number" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "employment_status" text NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "hired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "updated_at" timestamp with time zone NOT NULL DEFAULT now();--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_employment_status_chk" CHECK ("employees"."employment_status" IN ('active', 'suspended', 'separated'));--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_document_pair_chk" CHECK (("employees"."document_type" IS NULL AND "employees"."document_number" IS NULL) OR ("employees"."document_type" IS NOT NULL AND "employees"."document_number" IS NOT NULL));--> statement-breakpoint
CREATE UNIQUE INDEX "employees_company_document_idx" ON "employees" USING btree ("company_id", "document_type", "document_number") WHERE "employees"."document_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "employees_company_status_idx" ON "employees" USING btree ("company_id", "employment_status");
