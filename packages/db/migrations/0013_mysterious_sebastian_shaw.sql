ALTER TABLE "reminders" DROP CONSTRAINT "reminders_due_target_chk";--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "mode" varchar(16) DEFAULT 'one_off' NOT NULL;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "interval_km" integer;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "interval_months" smallint;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "last_performed_date" date;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "last_performed_mileage" integer;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_mode_chk" CHECK ("reminders"."mode" IN ('one_off', 'recurring'));--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_interval_km_chk" CHECK ("reminders"."interval_km" IS NULL OR "reminders"."interval_km" > 0);--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_interval_months_chk" CHECK ("reminders"."interval_months" IS NULL OR "reminders"."interval_months" > 0);--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_last_performed_mileage_chk" CHECK ("reminders"."last_performed_mileage" IS NULL OR "reminders"."last_performed_mileage" >= 0);--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_mode_fields_chk" CHECK (
        (
          "reminders"."mode" = 'one_off'
          AND ("reminders"."due_date" IS NOT NULL OR "reminders"."due_mileage" IS NOT NULL)
          AND "reminders"."interval_km" IS NULL
          AND "reminders"."interval_months" IS NULL
          AND "reminders"."last_performed_date" IS NULL
          AND "reminders"."last_performed_mileage" IS NULL
        )
        OR
        (
          "reminders"."mode" = 'recurring'
          AND ("reminders"."interval_km" IS NOT NULL OR "reminders"."interval_months" IS NOT NULL)
          AND ("reminders"."interval_km" IS NULL OR "reminders"."last_performed_mileage" IS NOT NULL)
          AND ("reminders"."interval_months" IS NULL OR "reminders"."last_performed_date" IS NOT NULL)
          AND "reminders"."due_date" IS NULL
          AND "reminders"."due_mileage" IS NULL
        )
      );