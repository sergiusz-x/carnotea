CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(120) NOT NULL,
	"record_id" uuid NOT NULL,
	"operation" varchar(20) NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_operation_chk" CHECK ("audit_logs"."operation" IN ('INSERT', 'UPDATE', 'DELETE'))
);
--> statement-breakpoint
CREATE TABLE "charging_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"charge_date" date NOT NULL,
	"mileage" integer NOT NULL,
	"energy_kwh" numeric(8, 2) NOT NULL,
	"price_per_kwh" numeric(8, 2) NOT NULL,
	"total_cost" numeric(10, 2) NOT NULL,
	"charger_type_id" smallint NOT NULL,
	"soc_start_percent" smallint,
	"soc_end_percent" smallint,
	"station_name" varchar(120),
	"is_full_charge" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charging_sessions_mileage_chk" CHECK ("charging_sessions"."mileage" >= 0),
	CONSTRAINT "charging_sessions_energy_kwh_chk" CHECK ("charging_sessions"."energy_kwh" > 0),
	CONSTRAINT "charging_sessions_price_per_kwh_chk" CHECK ("charging_sessions"."price_per_kwh" > 0),
	CONSTRAINT "charging_sessions_total_cost_chk" CHECK ("charging_sessions"."total_cost" = round("charging_sessions"."energy_kwh" * "charging_sessions"."price_per_kwh", 2)),
	CONSTRAINT "charging_sessions_soc_start_chk" CHECK ("charging_sessions"."soc_start_percent" IS NULL OR "charging_sessions"."soc_start_percent" BETWEEN 0 AND 100),
	CONSTRAINT "charging_sessions_soc_end_chk" CHECK ("charging_sessions"."soc_end_percent" IS NULL OR "charging_sessions"."soc_end_percent" BETWEEN 0 AND 100),
	CONSTRAINT "charging_sessions_soc_order_chk" CHECK ("charging_sessions"."soc_start_percent" IS NULL OR "charging_sessions"."soc_end_percent" IS NULL OR "charging_sessions"."soc_start_percent" < "charging_sessions"."soc_end_percent")
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40),
	"name" varchar(60) NOT NULL,
	CONSTRAINT "expense_categories_code_unique" UNIQUE("code"),
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"expense_date" date NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"source_type" varchar(40) DEFAULT 'manual' NOT NULL,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_chk" CHECK ("expenses"."amount" >= 0),
	CONSTRAINT "expenses_source_type_chk" CHECK ("expenses"."source_type" IN ('fuel_log', 'service_record', 'manual', 'other', 'charging_session'))
);
--> statement-breakpoint
CREATE TABLE "fuel_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"fuel_date" date NOT NULL,
	"mileage" integer NOT NULL,
	"liters" numeric(8, 2) NOT NULL,
	"price_per_liter" numeric(8, 2) NOT NULL,
	"total_cost" numeric(10, 2) NOT NULL,
	"station_name" varchar(120),
	"is_full_tank" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fuel_logs_mileage_chk" CHECK ("fuel_logs"."mileage" >= 0),
	CONSTRAINT "fuel_logs_liters_chk" CHECK ("fuel_logs"."liters" > 0),
	CONSTRAINT "fuel_logs_price_per_liter_chk" CHECK ("fuel_logs"."price_per_liter" > 0),
	CONSTRAINT "fuel_logs_total_cost_chk" CHECK ("fuel_logs"."total_cost" = round("fuel_logs"."liters" * "fuel_logs"."price_per_liter", 2))
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"reported_date" date NOT NULL,
	"resolved_date" date,
	"title" varchar(160) NOT NULL,
	"description" text,
	"status_id" smallint NOT NULL,
	"priority_id" smallint NOT NULL,
	"related_service_record_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issues_resolved_date_chk" CHECK ("issues"."resolved_date" IS NULL OR "issues"."resolved_date" >= "issues"."reported_date")
);
--> statement-breakpoint
CREATE TABLE "charger_types" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "charger_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" varchar(40) NOT NULL,
	"max_kw" numeric(6, 1),
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "charger_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "fuel_types" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fuel_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" varchar(30) NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "fuel_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "issue_priorities" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "issue_priorities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" varchar(30) NOT NULL,
	"weight" smallint NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "issue_priorities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "issue_statuses" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "issue_statuses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" varchar(30) NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "issue_statuses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "part_identifier_types" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "part_identifier_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" varchar(40) NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "part_identifier_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reminder_statuses" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reminder_statuses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" varchar(30) NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "reminder_statuses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "mileage_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"reading_date" date NOT NULL,
	"mileage" integer NOT NULL,
	"source_type" varchar(40) DEFAULT 'manual' NOT NULL,
	"source_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mileage_readings_mileage_chk" CHECK ("mileage_readings"."mileage" >= 0),
	CONSTRAINT "mileage_readings_source_type_chk" CHECK ("mileage_readings"."source_type" IN ('manual', 'fuel_log', 'service_record', 'charging_session')),
	CONSTRAINT "mileage_readings_source_id_chk" CHECK (("mileage_readings"."source_type" = 'manual' AND "mileage_readings"."source_id" IS NULL) OR ("mileage_readings"."source_type" <> 'manual' AND "mileage_readings"."source_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "part_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_id" uuid NOT NULL,
	"identifier_type_id" smallint NOT NULL,
	"source_name" varchar(120) NOT NULL,
	"identifier_value" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "part_identifiers_part_type_source_value_uq" UNIQUE("part_id","identifier_type_id","source_name","identifier_value"),
	CONSTRAINT "part_identifiers_source_name_chk" CHECK (length(trim("part_identifiers"."source_name")) > 0),
	CONSTRAINT "part_identifiers_value_chk" CHECK (length(trim("part_identifiers"."identifier_value")) > 0)
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"manufacturer" varchar(120),
	"part_number" varchar(80),
	"default_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parts_manufacturer_number_uq" UNIQUE("manufacturer","part_number"),
	CONSTRAINT "parts_default_price_chk" CHECK ("parts"."default_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"due_date" date,
	"due_mileage" integer,
	"status_id" smallint NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminders_due_mileage_chk" CHECK ("reminders"."due_mileage" IS NULL OR "reminders"."due_mileage" >= 0),
	CONSTRAINT "reminders_due_target_chk" CHECK ("reminders"."due_date" IS NOT NULL OR "reminders"."due_mileage" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "service_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_record_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	CONSTRAINT "service_parts_record_part_uq" UNIQUE("service_record_id","part_id"),
	CONSTRAINT "service_parts_quantity_chk" CHECK ("service_parts"."quantity" > 0),
	CONSTRAINT "service_parts_unit_price_chk" CHECK ("service_parts"."unit_price" >= 0),
	CONSTRAINT "service_parts_total_price_chk" CHECK ("service_parts"."total_price" = round("service_parts"."quantity" * "service_parts"."unit_price", 2))
);
--> statement-breakpoint
CREATE TABLE "service_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"service_date" date NOT NULL,
	"mileage" integer NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"labor_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"workshop_name" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_records_mileage_chk" CHECK ("service_records"."mileage" >= 0),
	CONSTRAINT "service_records_labor_cost_chk" CHECK ("service_records"."labor_cost" >= 0),
	CONSTRAINT "service_records_total_cost_chk" CHECK ("service_records"."total_cost" >= "service_records"."labor_cost")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(80) NOT NULL,
	"last_name" varchar(80) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase_chk" CHECK ("users"."email" = lower("users"."email")),
	CONSTRAINT "users_email_format_chk" CHECK (position('@' in "users"."email") > 1)
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brand" varchar(80) NOT NULL,
	"model" varchar(80) NOT NULL,
	"generation" varchar(80),
	"production_year" integer NOT NULL,
	"engine" varchar(80),
	"fuel_type_id" smallint NOT NULL,
	"vin" varchar(17),
	"registration_number" varchar(20),
	"current_mileage" integer DEFAULT 0 NOT NULL,
	"currency_code" varchar(3) DEFAULT 'EUR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_vin_unique" UNIQUE("vin"),
	CONSTRAINT "vehicles_registrationNumber_unique" UNIQUE("registration_number"),
	CONSTRAINT "vehicles_production_year_chk" CHECK ("vehicles"."production_year" BETWEEN 1950 AND (EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1)),
	CONSTRAINT "vehicles_vin_length_chk" CHECK ("vehicles"."vin" IS NULL OR length("vehicles"."vin") = 17),
	CONSTRAINT "vehicles_current_mileage_chk" CHECK ("vehicles"."current_mileage" >= 0),
	CONSTRAINT "vehicles_currency_code_chk" CHECK (char_length("vehicles"."currency_code") = 3)
);
--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_charger_type_id_charger_types_id_fk" FOREIGN KEY ("charger_type_id") REFERENCES "public"."charger_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_status_id_issue_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."issue_statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_priority_id_issue_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."issue_priorities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_related_service_record_id_service_records_id_fk" FOREIGN KEY ("related_service_record_id") REFERENCES "public"."service_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mileage_readings" ADD CONSTRAINT "mileage_readings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_identifiers" ADD CONSTRAINT "part_identifiers_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_identifiers" ADD CONSTRAINT "part_identifiers_identifier_type_id_part_identifier_types_id_fk" FOREIGN KEY ("identifier_type_id") REFERENCES "public"."part_identifier_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_status_id_reminder_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."reminder_statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_service_record_id_service_records_id_fk" FOREIGN KEY ("service_record_id") REFERENCES "public"."service_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_parts" ADD CONSTRAINT "service_parts_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_fuel_type_id_fuel_types_id_fk" FOREIGN KEY ("fuel_type_id") REFERENCES "public"."fuel_types"("id") ON DELETE restrict ON UPDATE no action;