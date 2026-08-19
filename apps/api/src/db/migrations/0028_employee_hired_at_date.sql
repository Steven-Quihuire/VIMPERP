ALTER TABLE "employees"
  ALTER COLUMN "hired_at" TYPE date
  USING ("hired_at" AT TIME ZONE 'UTC')::date;
