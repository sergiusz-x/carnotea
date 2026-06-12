-- Indexes used by common lookups and future API filters

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);

CREATE INDEX idx_mileage_readings_vehicle_id ON mileage_readings(vehicle_id);
CREATE INDEX idx_mileage_readings_vehicle_date ON mileage_readings(vehicle_id, reading_date, id);
CREATE UNIQUE INDEX idx_mileage_readings_source_unique
    ON mileage_readings(vehicle_id, source_type, source_id)
    WHERE source_type <> 'manual';

CREATE INDEX idx_fuel_logs_vehicle_id ON fuel_logs(vehicle_id);
CREATE INDEX idx_fuel_logs_fuel_date ON fuel_logs(fuel_date);

CREATE INDEX idx_service_records_vehicle_id ON service_records(vehicle_id);
CREATE INDEX idx_service_records_service_date ON service_records(service_date);

CREATE INDEX idx_part_identifiers_part_id ON part_identifiers(part_id);
CREATE INDEX idx_part_identifiers_lookup
    ON part_identifiers(identifier_type, source_name, identifier_value);

CREATE INDEX idx_service_parts_service_record_id ON service_parts(service_record_id);
CREATE INDEX idx_service_parts_part_id ON service_parts(part_id);

CREATE INDEX idx_issues_vehicle_id ON issues(vehicle_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_priority ON issues(priority);

CREATE INDEX idx_expenses_vehicle_id ON expenses(vehicle_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);

CREATE INDEX idx_reminders_vehicle_id ON reminders(vehicle_id);
CREATE INDEX idx_reminders_status ON reminders(status);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_vehicle_json_exports_vehicle_id ON vehicle_json_exports(vehicle_id);
