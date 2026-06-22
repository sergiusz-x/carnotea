ALTER TABLE "expenses" DROP CONSTRAINT "expenses_source_type_chk";--> statement-breakpoint
DROP INDEX "idx_expenses_source_unique";--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_expenses_source_unique" ON "expenses" USING btree ("vehicle_id","source_type","source_id") WHERE "expenses"."source_type" <> 'manual';--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_source_id_chk" CHECK (("expenses"."source_type" = 'manual' AND "expenses"."source_id" IS NULL) OR ("expenses"."source_type" <> 'manual' AND "expenses"."source_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_source_type_chk" CHECK ("expenses"."source_type" IN ('fuel_log', 'service_record', 'manual', 'charging_session'));