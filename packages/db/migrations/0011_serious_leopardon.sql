CREATE TABLE "fluid_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"fluid_type_id" smallint NOT NULL,
	"change_date" date NOT NULL,
	"mileage" integer NOT NULL,
	"quantity_liters" numeric(6, 2),
	"cost" numeric(10, 2),
	"interval_km" smallint,
	"interval_months" smallint,
	"workshop_name" varchar(120),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fluid_logs_mileage_chk" CHECK ("fluid_logs"."mileage" >= 0),
	CONSTRAINT "fluid_logs_quantity_liters_chk" CHECK ("fluid_logs"."quantity_liters" IS NULL OR "fluid_logs"."quantity_liters" > 0),
	CONSTRAINT "fluid_logs_cost_chk" CHECK ("fluid_logs"."cost" IS NULL OR "fluid_logs"."cost" >= 0),
	CONSTRAINT "fluid_logs_interval_km_chk" CHECK ("fluid_logs"."interval_km" IS NULL OR "fluid_logs"."interval_km" > 0),
	CONSTRAINT "fluid_logs_interval_months_chk" CHECK ("fluid_logs"."interval_months" IS NULL OR "fluid_logs"."interval_months" > 0)
);
--> statement-breakpoint
CREATE TABLE "fluid_types" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fluid_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" varchar(30) NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "fluid_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_source_type_chk";--> statement-breakpoint
ALTER TABLE "fluid_logs" ADD CONSTRAINT "fluid_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fluid_logs" ADD CONSTRAINT "fluid_logs_fluid_type_id_fluid_types_id_fk" FOREIGN KEY ("fluid_type_id") REFERENCES "public"."fluid_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fluid_logs_vehicle_id" ON "fluid_logs" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_fluid_logs_change_date" ON "fluid_logs" USING btree ("change_date");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_source_type_chk" CHECK ("expenses"."source_type" IN ('fuel_log', 'service_record', 'manual', 'charging_session', 'fluid_log'));
--> statement-breakpoint
INSERT INTO fluid_types (code, sort_order) VALUES
  ('engine_oil',           10),
  ('oil_filter',           20),
  ('brake_fluid',          30),
  ('coolant',              40),
  ('power_steering_fluid', 50),
  ('washer_fluid',         60),
  ('transmission_fluid',   70),
  ('other',                99);
--> statement-breakpoint
INSERT INTO expense_categories (code, name) VALUES
  ('fluids', 'Fluids');