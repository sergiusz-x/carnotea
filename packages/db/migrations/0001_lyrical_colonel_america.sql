CREATE INDEX "idx_audit_logs_table_record" ON "audit_logs" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "idx_charging_sessions_vehicle_id" ON "charging_sessions" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_charging_sessions_charge_date" ON "charging_sessions" USING btree ("charge_date");--> statement-breakpoint
CREATE INDEX "idx_expenses_vehicle_id" ON "expenses" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_expense_date" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "idx_expenses_category_id" ON "expenses" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_expenses_source_unique" ON "expenses" USING btree ("source_type","source_id") WHERE "expenses"."source_type" <> 'manual';--> statement-breakpoint
CREATE INDEX "idx_fuel_logs_vehicle_id" ON "fuel_logs" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_fuel_logs_fuel_date" ON "fuel_logs" USING btree ("fuel_date");--> statement-breakpoint
CREATE INDEX "idx_issues_vehicle_id" ON "issues" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_issues_status_id" ON "issues" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "idx_issues_priority_id" ON "issues" USING btree ("priority_id");--> statement-breakpoint
CREATE INDEX "idx_mileage_readings_vehicle_id" ON "mileage_readings" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_mileage_readings_vehicle_date" ON "mileage_readings" USING btree ("vehicle_id","reading_date","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mileage_readings_source_unique" ON "mileage_readings" USING btree ("vehicle_id","source_type","source_id") WHERE "mileage_readings"."source_type" <> 'manual';--> statement-breakpoint
CREATE INDEX "idx_part_identifiers_part_id" ON "part_identifiers" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "idx_part_identifiers_lookup" ON "part_identifiers" USING btree ("identifier_type_id","source_name","identifier_value");--> statement-breakpoint
CREATE INDEX "idx_reminders_vehicle_id" ON "reminders" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_reminders_status_id" ON "reminders" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "idx_reminders_status_due" ON "reminders" USING btree ("status_id","due_date");--> statement-breakpoint
CREATE INDEX "idx_service_parts_service_record_id" ON "service_parts" USING btree ("service_record_id");--> statement-breakpoint
CREATE INDEX "idx_service_parts_part_id" ON "service_parts" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "idx_service_records_vehicle_id" ON "service_records" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_service_records_service_date" ON "service_records" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX "idx_vehicles_user_id" ON "vehicles" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "issue_priorities" ADD CONSTRAINT "issue_priorities_weight_uq" UNIQUE("weight");