CREATE OR REPLACE FUNCTION "__vimcore_safe_audit_details_jsonb"(input text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
	RETURN input::jsonb;
EXCEPTION
	WHEN others THEN
		RETURN jsonb_build_object('malformedLegacyDetails', true);
END;
$$;--> statement-breakpoint
ALTER TABLE "audit_events" ALTER COLUMN "details" SET DATA TYPE jsonb USING "__vimcore_safe_audit_details_jsonb"("details");--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "correlation_id" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "entity_type" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "entity_id" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "old_values" jsonb;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "new_values" jsonb;--> statement-breakpoint
DROP FUNCTION "__vimcore_safe_audit_details_jsonb"(text);--> statement-breakpoint
CREATE INDEX "audit_events_company_created_at_idx" ON "audit_events" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_correlation_id_idx" ON "audit_events" USING btree ("correlation_id");
