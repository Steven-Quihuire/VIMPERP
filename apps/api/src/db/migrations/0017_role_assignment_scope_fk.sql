CREATE TABLE "stale_role_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"scope_type" "scope_node_type" NOT NULL,
	"scope_id" text,
	"expected_scope_node_id" text,
	"quarantine_reason" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"quarantined_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "role_assignments" ADD COLUMN "scope_node_id" text;--> statement-breakpoint
CREATE INDEX "role_assignments_scope_node_idx" ON "role_assignments" USING btree ("scope_node_id");--> statement-breakpoint
UPDATE "role_assignments"
SET "scope_id" = "company_id"
WHERE "scope_type" = 'company'
  AND "scope_id" IS NULL;--> statement-breakpoint
DO $$
DECLARE
	assignment_user RECORD;
BEGIN
	FOR assignment_user IN
		SELECT DISTINCT "user_id"
		FROM "role_assignments"
		ORDER BY "user_id"
	LOOP
		WITH resolved_assignments AS (
			SELECT
				ra."id",
				sn."id" AS "scope_node_id"
			FROM "role_assignments" ra
			JOIN "scope_nodes" sn
				ON sn."id" = CASE
					WHEN ra."scope_id" IS NULL THEN NULL
					ELSE ra."scope_type"::text || ':' || ra."scope_id"
				END
			   AND sn."company_id" = ra."company_id"
			WHERE ra."user_id" = assignment_user."user_id"
		)
		UPDATE "role_assignments" ra
		SET "scope_node_id" = resolved_assignments."scope_node_id"
		FROM resolved_assignments
		WHERE ra."id" = resolved_assignments."id";

		WITH dangling_assignments AS (
			SELECT
				ra."id",
				ra."company_id",
				ra."user_id",
				ra."role_id",
				ra."scope_type",
				ra."scope_id",
				ra."created_at",
				CASE
					WHEN ra."scope_id" IS NULL THEN NULL
					ELSE ra."scope_type"::text || ':' || ra."scope_id"
				END AS "expected_scope_node_id",
				CASE
					WHEN ra."scope_id" IS NULL THEN 'missing_scope_ref'
					ELSE 'missing_scope_node'
				END AS "quarantine_reason"
			FROM "role_assignments" ra
			WHERE ra."user_id" = assignment_user."user_id"
			  AND ra."scope_node_id" IS NULL
		)
		INSERT INTO "stale_role_assignments" (
			"id",
			"company_id",
			"user_id",
			"role_id",
			"scope_type",
			"scope_id",
			"expected_scope_node_id",
			"quarantine_reason",
			"created_at",
			"quarantined_at"
		)
		SELECT
			"id",
			"company_id",
			"user_id",
			"role_id",
			"scope_type",
			"scope_id",
			"expected_scope_node_id",
			"quarantine_reason",
			"created_at",
			now()
		FROM dangling_assignments;

		WITH dangling_assignments AS (
			SELECT
				ra."id",
				ra."company_id",
				ra."scope_type",
				ra."scope_id",
				CASE
					WHEN ra."scope_id" IS NULL THEN NULL
					ELSE ra."scope_type"::text || ':' || ra."scope_id"
				END AS "expected_scope_node_id",
				CASE
					WHEN ra."scope_id" IS NULL THEN 'missing_scope_ref'
					ELSE 'missing_scope_node'
				END AS "quarantine_reason"
			FROM "role_assignments" ra
			WHERE ra."user_id" = assignment_user."user_id"
			  AND ra."scope_node_id" IS NULL
		)
		INSERT INTO "audit_events" (
			"id",
			"actor_user_id",
			"company_id",
			"division_id",
			"local_id",
			"type",
			"correlation_id",
			"entity_type",
			"entity_id",
			"details",
			"old_values",
			"new_values",
			"created_at"
		)
		SELECT
			'migration:0017:role-assignment:' || dangling."id",
			'system:migration:0017',
			dangling."company_id",
			NULL,
			NULL,
			'role_assignment.scope_quarantined',
			'migration:0017:role_assignment_scope_fk',
			'role_assignment',
			dangling."id",
			jsonb_build_object(
				'action', 'quarantined',
				'assignmentId', dangling."id",
				'originalScopeType', dangling."scope_type"::text,
				'originalScopeId', dangling."scope_id"
			),
			jsonb_build_object(
				'assignmentId', dangling."id",
				'companyId', dangling."company_id",
				'originalScopeType', dangling."scope_type"::text,
				'originalScopeId', dangling."scope_id"
			),
			jsonb_build_object(
				'quarantineReason', dangling."quarantine_reason",
				'expectedScopeNodeId', dangling."expected_scope_node_id"
			),
			now()
		FROM dangling_assignments dangling;

		WITH dangling_assignments AS (
			SELECT ra."id"
			FROM "role_assignments" ra
			WHERE ra."user_id" = assignment_user."user_id"
			  AND ra."scope_node_id" IS NULL
		)
		DELETE FROM "role_assignments" ra
		USING dangling_assignments
		WHERE ra."id" = dangling_assignments."id";
	END LOOP;
END;
$$;--> statement-breakpoint
DROP INDEX IF EXISTS "role_assignments_unique_company_scope_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "role_assignments_unique_node_scope_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "role_assignments_unique_scope_idx" ON "role_assignments" USING btree ("company_id","user_id","role_id","scope_type","scope_id");--> statement-breakpoint
ALTER TABLE "role_assignments" ALTER COLUMN "scope_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "role_assignments" ALTER COLUMN "scope_node_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_scope_node_id_scope_nodes_id_fk" FOREIGN KEY ("scope_node_id") REFERENCES "public"."scope_nodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
