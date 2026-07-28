CREATE TYPE "public"."provisioning_status" AS ENUM('running', 'succeeded', 'failed', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."provisioning_step_status" AS ENUM('pending', 'succeeded', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "application_errors" (
	"id" text PRIMARY KEY NOT NULL,
	"correlation_id" text NOT NULL,
	"request_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"context" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provisioning_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"correlation_id" text NOT NULL,
	"request_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"process" text NOT NULL,
	"status" "provisioning_status" NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"idempotency_key" text,
	"error_summary" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provisioning_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "provisioning_step_status" NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "application_errors_correlation_id_idx" ON "application_errors" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "application_errors_fingerprint_idx" ON "application_errors" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "application_errors_created_at_idx" ON "application_errors" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provisioning_runs_process_idempotency_idx" ON "provisioning_runs" USING btree ("process","idempotency_key") WHERE "provisioning_runs"."idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "provisioning_runs_correlation_id_idx" ON "provisioning_runs" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "provisioning_runs_status_created_at_idx" ON "provisioning_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "provisioning_steps_run_id_created_at_idx" ON "provisioning_steps" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "provisioning_steps_status_idx" ON "provisioning_steps" USING btree ("status");