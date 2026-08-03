ALTER TABLE "provisioning_runs" ADD COLUMN "company_name" text;
--> statement-breakpoint
UPDATE "provisioning_runs" AS runs
SET "company_name" = companies."name"
FROM "provisioning_steps" AS steps
JOIN "companies" ON "companies"."id" = steps."detail"->>'companyId'
WHERE runs."id" = steps."run_id"
  AND steps."name" = 'company-creation'
  AND runs."company_name" IS NULL;
