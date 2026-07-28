CREATE TABLE "company_services" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "__vimcore_safe_parse_jsonb"(input text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
	RETURN input::jsonb;
EXCEPTION
	WHEN others THEN
		RETURN NULL;
END;
$$;
--> statement-breakpoint
INSERT INTO "company_services" ("id", "company_id", "name", "created_at")
SELECT
	md5(company_profile."company_id" || ':' || service_row."name"),
	company_profile."company_id",
	service_row."name",
	NOW()
FROM "company_profiles" AS company_profile
CROSS JOIN LATERAL (
	SELECT "__vimcore_safe_parse_jsonb"(company_profile."services") AS "services_json"
) AS parsed_services
CROSS JOIN LATERAL (
	SELECT DISTINCT trim(service_value) AS "name"
	FROM jsonb_array_elements_text(
		CASE
			WHEN jsonb_typeof(parsed_services."services_json") = 'array'
				THEN parsed_services."services_json"
			ELSE '[]'::jsonb
		END
	) AS service(service_value)
	WHERE trim(service_value) <> ''
) AS service_row;
--> statement-breakpoint
DROP FUNCTION "__vimcore_safe_parse_jsonb"(text);
--> statement-breakpoint
CREATE UNIQUE INDEX "company_services_company_name_idx" ON "company_services" USING btree ("company_id","name");
