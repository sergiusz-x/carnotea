ALTER TABLE "users" ADD COLUMN "locale_pref" varchar(2) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "units_pref" varchar(8) DEFAULT 'metric' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "currency_pref" varchar(3) DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_locale_pref_chk" CHECK ("users"."locale_pref" in ('pl', 'en'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_units_pref_chk" CHECK ("users"."units_pref" in ('metric', 'imperial'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_currency_pref_chk" CHECK ("users"."currency_pref" ~ '^[A-Z]{3}$');