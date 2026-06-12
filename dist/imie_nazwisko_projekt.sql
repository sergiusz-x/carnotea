/*
Project: Vehicle Diary

This database stores a simple vehicle maintenance diary for a future web/PWA
application. It allows users to manage vehicles, fuel logs, service records,
parts, issues, expenses, reminders, odometer mileage readings, audit logs, and
JSON exports of a vehicle history.

The script is prepared for a university project in Advanced Databases. It uses
PostgreSQL objects such as tables, constraints, indexes, functions, procedures,
triggers, views, cursors, transactions, exception handling, and JSONB.
*/

DROP SCHEMA IF EXISTS vehicle_diary CASCADE;
CREATE SCHEMA vehicle_diary;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
SET search_path TO vehicle_diary, public;

-- PostgreSQL 16 does not provide a built-in UUIDv7 generator. This helper keeps
-- history-like tables time-sortable while still using random bits for uniqueness.
CREATE OR REPLACE FUNCTION generate_uuid_v7()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $function$
DECLARE
    v_time_ms bigint;
    v_uuid bytea;
BEGIN
    v_time_ms := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
    v_uuid := public.gen_random_bytes(16);

    v_uuid := set_byte(v_uuid, 0, ((v_time_ms >> 40) & 255)::integer);
    v_uuid := set_byte(v_uuid, 1, ((v_time_ms >> 32) & 255)::integer);
    v_uuid := set_byte(v_uuid, 2, ((v_time_ms >> 24) & 255)::integer);
    v_uuid := set_byte(v_uuid, 3, ((v_time_ms >> 16) & 255)::integer);
    v_uuid := set_byte(v_uuid, 4, ((v_time_ms >> 8) & 255)::integer);
    v_uuid := set_byte(v_uuid, 5, (v_time_ms & 255)::integer);
    v_uuid := set_byte(v_uuid, 6, (get_byte(v_uuid, 6) & 15) | 112);
    v_uuid := set_byte(v_uuid, 8, (get_byte(v_uuid, 8) & 63) | 128);

    RETURN encode(v_uuid, 'hex')::uuid;
END;
$function$;


-- ============================================================
-- Source: sql/01_tables.sql
-- ============================================================
-- Tables and relations

CREATE TABLE users (
    id uuid DEFAULT public.gen_random_uuid() PRIMARY KEY,
    first_name varchar(80) NOT NULL,
    last_name varchar(80) NOT NULL,
    email varchar(255) NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_lowercase_chk CHECK (email = lower(email)),
    CONSTRAINT users_email_format_chk CHECK (position('@' in email) > 1)
);

CREATE TABLE vehicles (
    id uuid DEFAULT public.gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand varchar(80) NOT NULL,
    model varchar(80) NOT NULL,
    generation varchar(80),
    production_year integer NOT NULL,
    engine varchar(80),
    fuel_type varchar(30) NOT NULL,
    vin varchar(17) UNIQUE,
    registration_number varchar(20) UNIQUE,
    current_mileage integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT vehicles_production_year_chk CHECK (
        production_year BETWEEN 1950 AND (EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1)
    ),
    CONSTRAINT vehicles_fuel_type_chk CHECK (
        fuel_type IN ('petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'other')
    ),
    CONSTRAINT vehicles_vin_length_chk CHECK (vin IS NULL OR length(vin) = 17),
    CONSTRAINT vehicles_current_mileage_chk CHECK (current_mileage >= 0)
);

CREATE TABLE mileage_readings (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    reading_date date NOT NULL,
    mileage integer NOT NULL,
    source_type varchar(40) NOT NULL DEFAULT 'manual',
    source_id uuid,
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT mileage_readings_mileage_chk CHECK (mileage >= 0),
    CONSTRAINT mileage_readings_source_type_chk CHECK (
        source_type IN ('manual', 'fuel_log', 'service_record')
    ),
    CONSTRAINT mileage_readings_source_id_chk CHECK (
        (source_type = 'manual' AND source_id IS NULL)
        OR (source_type <> 'manual' AND source_id IS NOT NULL)
    )
);

CREATE TABLE fuel_logs (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    fuel_date date NOT NULL,
    mileage integer NOT NULL,
    liters numeric(8, 2) NOT NULL,
    price_per_liter numeric(8, 2) NOT NULL,
    total_cost numeric(10, 2) NOT NULL,
    station_name varchar(120),
    is_full_tank boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fuel_logs_mileage_chk CHECK (mileage >= 0),
    CONSTRAINT fuel_logs_liters_chk CHECK (liters > 0),
    CONSTRAINT fuel_logs_price_per_liter_chk CHECK (price_per_liter > 0),
    CONSTRAINT fuel_logs_total_cost_chk CHECK (total_cost = round(liters * price_per_liter, 2))
);

CREATE TABLE service_records (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_date date NOT NULL,
    mileage integer NOT NULL,
    title varchar(160) NOT NULL,
    description text,
    labor_cost numeric(10, 2) NOT NULL DEFAULT 0,
    total_cost numeric(10, 2) NOT NULL DEFAULT 0,
    workshop_name varchar(160),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT service_records_mileage_chk CHECK (mileage >= 0),
    CONSTRAINT service_records_labor_cost_chk CHECK (labor_cost >= 0),
    CONSTRAINT service_records_total_cost_chk CHECK (total_cost >= labor_cost)
);

CREATE TABLE parts (
    id uuid DEFAULT public.gen_random_uuid() PRIMARY KEY,
    name varchar(160) NOT NULL,
    manufacturer varchar(120),
    part_number varchar(80),
    default_price numeric(10, 2) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT parts_default_price_chk CHECK (default_price >= 0),
    CONSTRAINT parts_manufacturer_number_uq UNIQUE (manufacturer, part_number)
);

CREATE TABLE part_identifiers (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    part_id uuid NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    identifier_type varchar(40) NOT NULL,
    source_name varchar(120) NOT NULL,
    identifier_value varchar(120) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT part_identifiers_type_chk CHECK (
        identifier_type IN (
            'manufacturer_number',
            'oe_number',
            'ean',
            'tecdoc_article_id',
            'allegro_product_id',
            'other'
        )
    ),
    CONSTRAINT part_identifiers_source_name_chk CHECK (length(trim(source_name)) > 0),
    CONSTRAINT part_identifiers_value_chk CHECK (length(trim(identifier_value)) > 0),
    CONSTRAINT part_identifiers_part_type_source_value_uq UNIQUE (
        part_id,
        identifier_type,
        source_name,
        identifier_value
    )
);

CREATE TABLE service_parts (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    service_record_id uuid NOT NULL REFERENCES service_records(id) ON DELETE CASCADE,
    part_id uuid NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
    quantity numeric(10, 2) NOT NULL DEFAULT 1,
    unit_price numeric(10, 2) NOT NULL,
    total_price numeric(10, 2) NOT NULL,
    CONSTRAINT service_parts_quantity_chk CHECK (quantity > 0),
    CONSTRAINT service_parts_unit_price_chk CHECK (unit_price >= 0),
    CONSTRAINT service_parts_total_price_chk CHECK (total_price = round(quantity * unit_price, 2)),
    CONSTRAINT service_parts_record_part_uq UNIQUE (service_record_id, part_id)
);

CREATE TABLE issues (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    reported_date date NOT NULL,
    resolved_date date,
    title varchar(160) NOT NULL,
    description text,
    status varchar(30) NOT NULL DEFAULT 'open',
    priority varchar(30) NOT NULL DEFAULT 'medium',
    related_service_record_id uuid REFERENCES service_records(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT issues_status_chk CHECK (status IN ('open', 'in_progress', 'resolved', 'cancelled')),
    CONSTRAINT issues_priority_chk CHECK (priority IN ('low', 'medium', 'high')),
    CONSTRAINT issues_resolved_date_chk CHECK (resolved_date IS NULL OR resolved_date >= reported_date),
    CONSTRAINT issues_resolved_status_chk CHECK (status <> 'resolved' OR resolved_date IS NOT NULL)
);

CREATE TABLE expense_categories (
    id uuid DEFAULT public.gen_random_uuid() PRIMARY KEY,
    name varchar(60) NOT NULL UNIQUE,
    description text
);

CREATE TABLE expenses (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    expense_date date NOT NULL,
    amount numeric(10, 2) NOT NULL,
    description text NOT NULL,
    source_type varchar(40) NOT NULL DEFAULT 'manual',
    source_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT expenses_amount_chk CHECK (amount >= 0),
    CONSTRAINT expenses_source_type_chk CHECK (source_type IN ('fuel_log', 'service_record', 'manual', 'other'))
);

CREATE TABLE reminders (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    title varchar(160) NOT NULL,
    description text,
    due_date date,
    due_mileage integer,
    status varchar(30) NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reminders_due_mileage_chk CHECK (due_mileage IS NULL OR due_mileage >= 0),
    CONSTRAINT reminders_status_chk CHECK (status IN ('pending', 'done', 'cancelled')),
    CONSTRAINT reminders_due_target_chk CHECK (due_date IS NOT NULL OR due_mileage IS NOT NULL)
);

CREATE TABLE audit_logs (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    table_name varchar(120) NOT NULL,
    record_id uuid NOT NULL,
    operation varchar(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_operation_chk CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE TABLE vehicle_json_exports (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    json_data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- Source: sql/02_indexes.sql
-- ============================================================
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


-- ============================================================
-- Source: sql/03_functions.sql
-- ============================================================
-- Functions

CREATE OR REPLACE FUNCTION calculate_average_fuel_consumption(p_vehicle_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $function$
DECLARE
    v_result numeric(8, 2);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = p_vehicle_id) THEN
        RAISE EXCEPTION 'Vehicle with id % does not exist.', p_vehicle_id;
    END IF;

    WITH ordered_logs AS (
        SELECT
            mileage,
            liters,
            mileage - lag(mileage) OVER (ORDER BY mileage, fuel_date, id) AS distance_km
        FROM fuel_logs
        WHERE vehicle_id = p_vehicle_id
          AND is_full_tank = true
    )
    SELECT round(avg((liters / distance_km) * 100), 2)
    INTO v_result
    FROM ordered_logs
    WHERE distance_km > 0;

    RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION calculate_total_vehicle_cost(p_vehicle_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $function$
DECLARE
    v_total numeric(12, 2);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = p_vehicle_id) THEN
        RAISE EXCEPTION 'Vehicle with id % does not exist.', p_vehicle_id;
    END IF;

    SELECT coalesce(sum(amount), 0)
    INTO v_total
    FROM expenses
    WHERE vehicle_id = p_vehicle_id;

    RETURN v_total;
END;
$function$;

CREATE OR REPLACE FUNCTION get_vehicle_cost_history(p_vehicle_id uuid)
RETURNS TABLE (
    cost_date date,
    category_name varchar,
    amount numeric,
    description text,
    source_type varchar
)
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = p_vehicle_id) THEN
        RAISE EXCEPTION 'Vehicle with id % does not exist.', p_vehicle_id;
    END IF;

    RETURN QUERY
    SELECT
        e.expense_date,
        c.name,
        e.amount,
        e.description,
        e.source_type
    FROM expenses e
    JOIN expense_categories c ON c.id = e.category_id
    WHERE e.vehicle_id = p_vehicle_id
    ORDER BY e.expense_date, e.id;
END;
$function$;


-- ============================================================
-- Source: sql/04_triggers.sql
-- ============================================================
-- Triggers

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vehicles_set_updated_at
BEFORE UPDATE ON vehicles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_mileage_readings_set_updated_at
BEFORE UPDATE ON mileage_readings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_service_records_set_updated_at
BEFORE UPDATE ON service_records
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_issues_set_updated_at
BEFORE UPDATE ON issues
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reminders_set_updated_at
BEFORE UPDATE ON reminders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION log_service_record_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO audit_logs (table_name, record_id, operation, old_data)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD));

    RETURN OLD;
END;
$function$;

CREATE TRIGGER trg_service_records_log_delete
AFTER DELETE ON service_records
FOR EACH ROW
EXECUTE FUNCTION log_service_record_delete();

CREATE OR REPLACE FUNCTION log_expense_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD IS DISTINCT FROM NEW THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_expenses_log_update
AFTER UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION log_expense_update();

CREATE OR REPLACE FUNCTION refresh_vehicle_current_mileage(p_vehicle_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE vehicles
    SET current_mileage = coalesce((
        SELECT max(mr.mileage)
        FROM mileage_readings mr
        WHERE mr.vehicle_id = p_vehicle_id
    ), 0)
    WHERE id = p_vehicle_id;
END;
$function$;

CREATE OR REPLACE FUNCTION refresh_vehicle_current_mileage_after_reading()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_vehicle_current_mileage(OLD.vehicle_id);
        RETURN OLD;
    END IF;

    PERFORM refresh_vehicle_current_mileage(NEW.vehicle_id);

    IF TG_OP = 'UPDATE' THEN
        IF OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
            PERFORM refresh_vehicle_current_mileage(OLD.vehicle_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_mileage_readings_refresh_vehicle
AFTER INSERT OR UPDATE OR DELETE ON mileage_readings
FOR EACH ROW
EXECUTE FUNCTION refresh_vehicle_current_mileage_after_reading();

CREATE OR REPLACE FUNCTION sync_fuel_log_mileage_reading()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM mileage_readings
        WHERE vehicle_id = OLD.vehicle_id
          AND source_type = 'fuel_log'
          AND source_id = OLD.id;

        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
            DELETE FROM mileage_readings
            WHERE vehicle_id = OLD.vehicle_id
              AND source_type = 'fuel_log'
              AND source_id = OLD.id;
        END IF;
    END IF;

    INSERT INTO mileage_readings (
        vehicle_id,
        reading_date,
        mileage,
        source_type,
        source_id,
        note
    )
    VALUES (
        NEW.vehicle_id,
        NEW.fuel_date,
        NEW.mileage,
        'fuel_log',
        NEW.id,
        'Mileage recorded from fuel log'
    )
    ON CONFLICT (vehicle_id, source_type, source_id) WHERE source_type <> 'manual'
    DO UPDATE SET
        reading_date = EXCLUDED.reading_date,
        mileage = EXCLUDED.mileage,
        note = EXCLUDED.note;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_fuel_logs_sync_mileage_reading
AFTER INSERT OR UPDATE OF vehicle_id, fuel_date, mileage ON fuel_logs
FOR EACH ROW
EXECUTE FUNCTION sync_fuel_log_mileage_reading();

CREATE TRIGGER trg_fuel_logs_delete_mileage_reading
AFTER DELETE ON fuel_logs
FOR EACH ROW
EXECUTE FUNCTION sync_fuel_log_mileage_reading();

CREATE OR REPLACE FUNCTION sync_service_record_mileage_reading()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM mileage_readings
        WHERE vehicle_id = OLD.vehicle_id
          AND source_type = 'service_record'
          AND source_id = OLD.id;

        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
            DELETE FROM mileage_readings
            WHERE vehicle_id = OLD.vehicle_id
              AND source_type = 'service_record'
              AND source_id = OLD.id;
        END IF;
    END IF;

    INSERT INTO mileage_readings (
        vehicle_id,
        reading_date,
        mileage,
        source_type,
        source_id,
        note
    )
    VALUES (
        NEW.vehicle_id,
        NEW.service_date,
        NEW.mileage,
        'service_record',
        NEW.id,
        'Mileage recorded from service record'
    )
    ON CONFLICT (vehicle_id, source_type, source_id) WHERE source_type <> 'manual'
    DO UPDATE SET
        reading_date = EXCLUDED.reading_date,
        mileage = EXCLUDED.mileage,
        note = EXCLUDED.note;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_service_records_sync_mileage_reading
AFTER INSERT OR UPDATE OF vehicle_id, service_date, mileage ON service_records
FOR EACH ROW
EXECUTE FUNCTION sync_service_record_mileage_reading();

CREATE TRIGGER trg_service_records_delete_mileage_reading
AFTER DELETE ON service_records
FOR EACH ROW
EXECUTE FUNCTION sync_service_record_mileage_reading();


-- ============================================================
-- Source: sql/05_procedures.sql
-- ============================================================
-- Procedures

CREATE OR REPLACE PROCEDURE add_mileage_reading(
    IN p_vehicle_id uuid,
    IN p_reading_date date,
    IN p_mileage integer,
    IN p_note text DEFAULT NULL,
    INOUT p_mileage_reading_id uuid DEFAULT NULL
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = p_vehicle_id) THEN
        RAISE EXCEPTION 'Vehicle with id % does not exist.', p_vehicle_id;
    END IF;

    IF p_reading_date IS NULL THEN
        RAISE EXCEPTION 'Reading date is required.';
    END IF;

    IF p_mileage IS NULL OR p_mileage < 0 THEN
        RAISE EXCEPTION 'Mileage must be greater than or equal to 0.';
    END IF;

    INSERT INTO mileage_readings (
        vehicle_id,
        reading_date,
        mileage,
        source_type,
        source_id,
        note
    )
    VALUES (
        p_vehicle_id,
        p_reading_date,
        p_mileage,
        'manual',
        NULL,
        NULLIF(trim(p_note), '')
    )
    RETURNING id INTO p_mileage_reading_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'add_mileage_reading failed: %', SQLERRM
            USING ERRCODE = SQLSTATE;
END;
$procedure$;

CREATE OR REPLACE PROCEDURE add_fuel_log(
    IN p_vehicle_id uuid,
    IN p_fuel_date date,
    IN p_mileage integer,
    IN p_liters numeric,
    IN p_price_per_liter numeric,
    IN p_station_name text DEFAULT NULL,
    IN p_is_full_tank boolean DEFAULT true,
    INOUT p_fuel_log_id uuid DEFAULT NULL
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_total_cost numeric(10, 2);
    v_category_id uuid;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = p_vehicle_id) THEN
        RAISE EXCEPTION 'Vehicle with id % does not exist.', p_vehicle_id;
    END IF;

    IF p_fuel_date IS NULL THEN
        RAISE EXCEPTION 'Fuel date is required.';
    END IF;

    IF p_mileage IS NULL OR p_mileage < 0 THEN
        RAISE EXCEPTION 'Mileage must be greater than or equal to 0.';
    END IF;

    IF p_liters IS NULL OR p_liters <= 0 THEN
        RAISE EXCEPTION 'Liters must be greater than 0.';
    END IF;

    IF p_price_per_liter IS NULL OR p_price_per_liter <= 0 THEN
        RAISE EXCEPTION 'Price per liter must be greater than 0.';
    END IF;

    SELECT id
    INTO v_category_id
    FROM expense_categories
    WHERE name = 'Fuel';

    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Expense category Fuel does not exist.';
    END IF;

    v_total_cost := round(p_liters * p_price_per_liter, 2);

    INSERT INTO fuel_logs (
        vehicle_id,
        fuel_date,
        mileage,
        liters,
        price_per_liter,
        total_cost,
        station_name,
        is_full_tank
    )
    VALUES (
        p_vehicle_id,
        p_fuel_date,
        p_mileage,
        p_liters,
        p_price_per_liter,
        v_total_cost,
        p_station_name,
        coalesce(p_is_full_tank, true)
    )
    RETURNING id INTO p_fuel_log_id;

    INSERT INTO expenses (
        vehicle_id,
        category_id,
        expense_date,
        amount,
        description,
        source_type,
        source_id
    )
    VALUES (
        p_vehicle_id,
        v_category_id,
        p_fuel_date,
        v_total_cost,
        'Fuel purchase',
        'fuel_log',
        p_fuel_log_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'add_fuel_log failed: %', SQLERRM
            USING ERRCODE = SQLSTATE;
END;
$procedure$;

CREATE OR REPLACE PROCEDURE add_service_record(
    IN p_vehicle_id uuid,
    IN p_service_date date,
    IN p_mileage integer,
    IN p_title text,
    IN p_description text,
    IN p_labor_cost numeric,
    IN p_total_cost numeric,
    IN p_workshop_name text DEFAULT NULL,
    INOUT p_service_record_id uuid DEFAULT NULL
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_category_id uuid;
    v_labor_cost numeric(10, 2);
    v_total_cost numeric(10, 2);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = p_vehicle_id) THEN
        RAISE EXCEPTION 'Vehicle with id % does not exist.', p_vehicle_id;
    END IF;

    IF p_service_date IS NULL THEN
        RAISE EXCEPTION 'Service date is required.';
    END IF;

    IF p_mileage IS NULL OR p_mileage < 0 THEN
        RAISE EXCEPTION 'Mileage must be greater than or equal to 0.';
    END IF;

    IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
        RAISE EXCEPTION 'Service title is required.';
    END IF;

    v_labor_cost := coalesce(p_labor_cost, 0);
    v_total_cost := coalesce(p_total_cost, v_labor_cost);

    IF v_labor_cost < 0 THEN
        RAISE EXCEPTION 'Labor cost must be greater than or equal to 0.';
    END IF;

    IF v_total_cost < v_labor_cost THEN
        RAISE EXCEPTION 'Total cost must be greater than or equal to labor cost.';
    END IF;

    SELECT id
    INTO v_category_id
    FROM expense_categories
    WHERE name = 'Service';

    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Expense category Service does not exist.';
    END IF;

    INSERT INTO service_records (
        vehicle_id,
        service_date,
        mileage,
        title,
        description,
        labor_cost,
        total_cost,
        workshop_name
    )
    VALUES (
        p_vehicle_id,
        p_service_date,
        p_mileage,
        trim(p_title),
        p_description,
        v_labor_cost,
        v_total_cost,
        p_workshop_name
    )
    RETURNING id INTO p_service_record_id;

    IF v_total_cost > 0 THEN
        INSERT INTO expenses (
            vehicle_id,
            category_id,
            expense_date,
            amount,
            description,
            source_type,
            source_id
        )
        VALUES (
            p_vehicle_id,
            v_category_id,
            p_service_date,
            v_total_cost,
            trim(p_title),
            'service_record',
            p_service_record_id
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'add_service_record failed: %', SQLERRM
            USING ERRCODE = SQLSTATE;
END;
$procedure$;

CREATE OR REPLACE PROCEDURE resolve_issue_with_service(
    IN p_issue_id uuid,
    IN p_service_date date,
    IN p_mileage integer,
    IN p_service_title text,
    IN p_service_description text,
    IN p_labor_cost numeric,
    IN p_total_cost numeric,
    IN p_workshop_name text DEFAULT NULL,
    IN p_resolved_date date DEFAULT CURRENT_DATE,
    INOUT p_service_record_id uuid DEFAULT NULL
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_vehicle_id uuid;
    v_issue_status varchar(30);
BEGIN
    SELECT vehicle_id, status
    INTO v_vehicle_id, v_issue_status
    FROM issues
    WHERE id = p_issue_id
    FOR UPDATE;

    IF v_vehicle_id IS NULL THEN
        RAISE EXCEPTION 'Issue with id % does not exist.', p_issue_id;
    END IF;

    IF v_issue_status = 'resolved' THEN
        RAISE EXCEPTION 'Issue with id % is already resolved.', p_issue_id;
    END IF;

    CALL add_service_record(
        v_vehicle_id,
        p_service_date,
        p_mileage,
        p_service_title,
        p_service_description,
        p_labor_cost,
        p_total_cost,
        p_workshop_name,
        p_service_record_id
    );

    UPDATE issues
    SET
        status = 'resolved',
        resolved_date = coalesce(p_resolved_date, p_service_date),
        related_service_record_id = p_service_record_id
    WHERE id = p_issue_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'resolve_issue_with_service failed: %', SQLERRM
            USING ERRCODE = SQLSTATE;
END;
$procedure$;

-- This procedure is called inside an explicit transaction in 08_demo_calls.sql.
-- If an error happens, the exception is re-raised so the caller transaction can
-- be rolled back by PostgreSQL. The cursor exports one JSON document per vehicle
-- owned by the selected user.
CREATE OR REPLACE PROCEDURE export_vehicles_to_json(IN p_user_id uuid)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    vehicle_cursor CURSOR FOR
        SELECT
            v.id AS vehicle_id,
            v.brand,
            v.model,
            v.generation,
            v.production_year,
            v.engine,
            v.fuel_type,
            v.vin,
            v.registration_number,
            v.current_mileage,
            u.id AS owner_id,
            u.first_name,
            u.last_name,
            u.email
        FROM vehicles v
        JOIN users u ON u.id = v.user_id
        WHERE v.user_id = p_user_id
        ORDER BY v.id;
    v_vehicle record;
    v_json jsonb;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User id is required.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User with id % does not exist.', p_user_id;
    END IF;

    DELETE FROM vehicle_json_exports vje
    USING vehicles v
    WHERE v.id = vje.vehicle_id
      AND v.user_id = p_user_id;

    OPEN vehicle_cursor;

    LOOP
        FETCH vehicle_cursor INTO v_vehicle;
        EXIT WHEN NOT FOUND;

        SELECT jsonb_build_object(
            'vehicle', jsonb_build_object(
                'id', v_vehicle.vehicle_id,
                'brand', v_vehicle.brand,
                'model', v_vehicle.model,
                'generation', v_vehicle.generation,
                'production_year', v_vehicle.production_year,
                'engine', v_vehicle.engine,
                'fuel_type', v_vehicle.fuel_type,
                'vin', v_vehicle.vin,
                'registration_number', v_vehicle.registration_number,
                'current_mileage', v_vehicle.current_mileage
            ),
            'owner', jsonb_build_object(
                'id', v_vehicle.owner_id,
                'first_name', v_vehicle.first_name,
                'last_name', v_vehicle.last_name,
                'email', v_vehicle.email
            ),
            'mileage_readings', coalesce((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'reading_date', mr.reading_date,
                        'mileage', mr.mileage,
                        'source_type', mr.source_type,
                        'source_id', mr.source_id,
                        'note', mr.note
                    )
                    ORDER BY mr.reading_date, mr.id
                )
                FROM mileage_readings mr
                WHERE mr.vehicle_id = v_vehicle.vehicle_id
            ), '[]'::jsonb),
            'fuel_logs', coalesce((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'fuel_date', fl.fuel_date,
                        'mileage', fl.mileage,
                        'liters', fl.liters,
                        'price_per_liter', fl.price_per_liter,
                        'total_cost', fl.total_cost,
                        'station_name', fl.station_name,
                        'is_full_tank', fl.is_full_tank
                    )
                    ORDER BY fl.fuel_date, fl.id
                )
                FROM fuel_logs fl
                WHERE fl.vehicle_id = v_vehicle.vehicle_id
            ), '[]'::jsonb),
            'service_records', coalesce((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'service_date', sr.service_date,
                        'mileage', sr.mileage,
                        'title', sr.title,
                        'description', sr.description,
                        'labor_cost', sr.labor_cost,
                        'total_cost', sr.total_cost,
                        'workshop_name', sr.workshop_name,
                        'parts', coalesce((
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'name', p.name,
                                    'manufacturer', p.manufacturer,
                                    'part_number', p.part_number,
                                    'identifiers', coalesce((
                                        SELECT jsonb_agg(
                                            jsonb_build_object(
                                                'type', pi.identifier_type,
                                                'source_name', pi.source_name,
                                                'value', pi.identifier_value
                                            )
                                            ORDER BY pi.identifier_type, pi.source_name, pi.identifier_value
                                        )
                                        FROM part_identifiers pi
                                        WHERE pi.part_id = p.id
                                    ), '[]'::jsonb),
                                    'quantity', sp.quantity,
                                    'unit_price', sp.unit_price,
                                    'total_price', sp.total_price
                                )
                                ORDER BY p.name
                            )
                            FROM service_parts sp
                            JOIN parts p ON p.id = sp.part_id
                            WHERE sp.service_record_id = sr.id
                        ), '[]'::jsonb)
                    )
                    ORDER BY sr.service_date, sr.id
                )
                FROM service_records sr
                WHERE sr.vehicle_id = v_vehicle.vehicle_id
            ), '[]'::jsonb),
            'issues', coalesce((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'reported_date', i.reported_date,
                        'resolved_date', i.resolved_date,
                        'title', i.title,
                        'status', i.status,
                        'priority', i.priority,
                        'related_service_record_id', i.related_service_record_id
                    )
                    ORDER BY i.reported_date, i.id
                )
                FROM issues i
                WHERE i.vehicle_id = v_vehicle.vehicle_id
            ), '[]'::jsonb),
            'expenses', coalesce((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'expense_date', e.expense_date,
                        'category', ec.name,
                        'amount', e.amount,
                        'description', e.description,
                        'source_type', e.source_type,
                        'source_id', e.source_id
                    )
                    ORDER BY e.expense_date, e.id
                )
                FROM expenses e
                JOIN expense_categories ec ON ec.id = e.category_id
                WHERE e.vehicle_id = v_vehicle.vehicle_id
            ), '[]'::jsonb),
            'reminders', coalesce((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'title', r.title,
                        'description', r.description,
                        'due_date', r.due_date,
                        'due_mileage', r.due_mileage,
                        'status', r.status
                    )
                    ORDER BY r.due_date NULLS LAST, r.due_mileage NULLS LAST, r.id
                )
                FROM reminders r
                WHERE r.vehicle_id = v_vehicle.vehicle_id
            ), '[]'::jsonb)
        )
        INTO v_json;

        INSERT INTO vehicle_json_exports (vehicle_id, json_data)
        VALUES (v_vehicle.vehicle_id, v_json);
    END LOOP;

    CLOSE vehicle_cursor;
EXCEPTION
    WHEN OTHERS THEN
        BEGIN
            CLOSE vehicle_cursor;
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;

        RAISE EXCEPTION 'export_vehicles_to_json failed for user %: %', p_user_id, SQLERRM
            USING ERRCODE = SQLSTATE;
END;
$procedure$;


-- ============================================================
-- Source: sql/06_views.sql
-- ============================================================
-- Views

CREATE OR REPLACE VIEW vehicle_summary_view AS
SELECT
    v.id AS vehicle_id,
    u.first_name || ' ' || u.last_name AS owner_name,
    v.brand,
    v.model,
    v.generation,
    v.production_year,
    v.engine,
    v.fuel_type,
    v.current_mileage,
    (SELECT count(*) FROM mileage_readings mr WHERE mr.vehicle_id = v.id) AS mileage_reading_count,
    (SELECT max(mr.reading_date) FROM mileage_readings mr WHERE mr.vehicle_id = v.id) AS last_mileage_reading_date,
    (SELECT count(*) FROM fuel_logs fl WHERE fl.vehicle_id = v.id) AS fuel_log_count,
    (SELECT count(*) FROM service_records sr WHERE sr.vehicle_id = v.id) AS service_record_count,
    (
        SELECT count(*)
        FROM issues i
        WHERE i.vehicle_id = v.id
          AND i.status IN ('open', 'in_progress')
    ) AS active_issue_count,
    calculate_total_vehicle_cost(v.id) AS total_cost,
    calculate_average_fuel_consumption(v.id) AS average_fuel_consumption
FROM vehicles v
JOIN users u ON u.id = v.user_id;

CREATE OR REPLACE VIEW vehicle_mileage_history_view AS
SELECT
    mr.id AS mileage_reading_id,
    mr.vehicle_id,
    v.brand,
    v.model,
    u.first_name || ' ' || u.last_name AS owner_name,
    mr.reading_date,
    mr.mileage,
    mr.source_type,
    mr.source_id,
    mr.note
FROM mileage_readings mr
JOIN vehicles v ON v.id = mr.vehicle_id
JOIN users u ON u.id = v.user_id;

CREATE OR REPLACE VIEW active_issues_view AS
SELECT
    i.id AS issue_id,
    v.id AS vehicle_id,
    v.brand,
    v.model,
    u.first_name || ' ' || u.last_name AS owner_name,
    i.title,
    i.priority,
    i.status,
    i.reported_date
FROM issues i
JOIN vehicles v ON v.id = i.vehicle_id
JOIN users u ON u.id = v.user_id
WHERE i.status IN ('open', 'in_progress');

CREATE OR REPLACE VIEW monthly_vehicle_costs_view AS
SELECT
    v.id AS vehicle_id,
    v.brand,
    v.model,
    to_char(date_trunc('month', e.expense_date), 'YYYY-MM') AS month,
    sum(e.amount) AS total_amount,
    count(*) AS expense_count
FROM expenses e
JOIN vehicles v ON v.id = e.vehicle_id
GROUP BY
    v.id,
    v.brand,
    v.model,
    date_trunc('month', e.expense_date);


-- ============================================================
-- Source: sql/07_seed_data.sql
-- ============================================================
-- Seed data

INSERT INTO users (id, first_name, last_name, email) VALUES
    ('11111111-1111-4111-8111-111111111111', 'John', 'Driver', 'john.driver@example.com'),
    ('22222222-2222-4222-8222-222222222222', 'Anna', 'Road', 'anna.road@example.com'),
    ('33333333-3333-4333-8333-333333333333', 'Michael', 'Garage', 'michael.garage@example.com');

INSERT INTO vehicles (
    id,
    user_id,
    brand,
    model,
    generation,
    production_year,
    engine,
    fuel_type,
    vin,
    registration_number,
    current_mileage
) VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Mazda', '6', 'GG', 2006, '2.0', 'petrol', 'JM1GG12F761234567', 'GD62501', 245520),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '22222222-2222-4222-8222-222222222222', 'Toyota', 'Corolla', 'E210', 2020, '1.8 Hybrid', 'hybrid', 'JTDBR32E520123456', 'KR20200', 51200),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '33333333-3333-4333-8333-333333333333', 'BMW', '3 Series', 'E46', 2004, '2.0 Diesel', 'diesel', 'WBAAL710X0AE12345', 'PO30404', 218500);

INSERT INTO expense_categories (id, name, description) VALUES
    ('f1000000-0000-4000-8000-000000000001', 'Fuel', 'Fuel purchases and charging costs.'),
    ('f1000000-0000-4000-8000-000000000002', 'Service', 'Workshop labor and maintenance records.'),
    ('f1000000-0000-4000-8000-000000000003', 'Parts', 'Standalone car parts.'),
    ('f1000000-0000-4000-8000-000000000004', 'Insurance', 'Vehicle insurance costs.'),
    ('f1000000-0000-4000-8000-000000000005', 'Inspection', 'Technical inspection costs.'),
    ('f1000000-0000-4000-8000-000000000006', 'Other', 'Other vehicle costs.');

INSERT INTO parts (id, name, manufacturer, part_number, default_price) VALUES
    ('a1000000-0000-4000-8000-000000000001', 'Oxygen sensor', 'Bosch', '0258006028', 250.00),
    ('a1000000-0000-4000-8000-000000000002', 'Oil filter', 'Mann', 'W712/52', 35.00),
    ('a1000000-0000-4000-8000-000000000003', 'Engine oil 5W-40', 'Castrol', 'EDGE-5W40-4L', 180.00),
    ('a1000000-0000-4000-8000-000000000004', 'Spark plug', 'NGK', 'BKR6E', 30.00),
    ('a1000000-0000-4000-8000-000000000005', 'Front brake disc', 'ATE', '24.0125-0158.1', 210.00),
    ('a1000000-0000-4000-8000-000000000006', 'Front brake pads', 'ATE', '13.0460-7117.2', 180.00);

INSERT INTO part_identifiers (
    id,
    part_id,
    identifier_type,
    source_name,
    identifier_value
) VALUES
    ('01976000-0020-7000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'manufacturer_number', 'Bosch', '0258006028'),
    ('01976000-0020-7000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'oe_number', 'Mazda', 'LFH1-18-861'),
    ('01976000-0020-7000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'ean', 'Bosch', '4047023034634'),
    ('01976000-0020-7000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'tecdoc_article_id', 'TecDoc', 'BOS-0258006028'),
    ('01976000-0020-7000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002', 'manufacturer_number', 'Mann', 'W712/52'),
    ('01976000-0020-7000-8000-000000000006', 'a1000000-0000-4000-8000-000000000002', 'oe_number', 'Mazda', 'LF10-14-302'),
    ('01976000-0020-7000-8000-000000000007', 'a1000000-0000-4000-8000-000000000002', 'ean', 'Mann', '4011558732908'),
    ('01976000-0020-7000-8000-000000000008', 'a1000000-0000-4000-8000-000000000002', 'tecdoc_article_id', 'TecDoc', 'MAN-W71252'),
    ('01976000-0020-7000-8000-000000000009', 'a1000000-0000-4000-8000-000000000003', 'manufacturer_number', 'Castrol', 'EDGE-5W40-4L'),
    ('01976000-0020-7000-8000-000000000010', 'a1000000-0000-4000-8000-000000000003', 'ean', 'Castrol', '4008177073712'),
    ('01976000-0020-7000-8000-000000000011', 'a1000000-0000-4000-8000-000000000003', 'allegro_product_id', 'Allegro', 'AL-CASTROL-EDGE-5W40'),
    ('01976000-0020-7000-8000-000000000012', 'a1000000-0000-4000-8000-000000000004', 'manufacturer_number', 'NGK', 'BKR6E'),
    ('01976000-0020-7000-8000-000000000013', 'a1000000-0000-4000-8000-000000000004', 'oe_number', 'Mazda', 'BP01-18-110'),
    ('01976000-0020-7000-8000-000000000014', 'a1000000-0000-4000-8000-000000000004', 'tecdoc_article_id', 'TecDoc', 'NGK-BKR6E'),
    ('01976000-0020-7000-8000-000000000015', 'a1000000-0000-4000-8000-000000000005', 'manufacturer_number', 'ATE', '24.0125-0158.1'),
    ('01976000-0020-7000-8000-000000000016', 'a1000000-0000-4000-8000-000000000005', 'oe_number', 'BMW', '34116767059'),
    ('01976000-0020-7000-8000-000000000017', 'a1000000-0000-4000-8000-000000000005', 'tecdoc_article_id', 'TecDoc', 'ATE-24012501581'),
    ('01976000-0020-7000-8000-000000000018', 'a1000000-0000-4000-8000-000000000006', 'manufacturer_number', 'ATE', '13.0460-7117.2'),
    ('01976000-0020-7000-8000-000000000019', 'a1000000-0000-4000-8000-000000000006', 'oe_number', 'BMW', '34116761244'),
    ('01976000-0020-7000-8000-000000000020', 'a1000000-0000-4000-8000-000000000006', 'tecdoc_article_id', 'TecDoc', 'ATE-13046071172');

INSERT INTO fuel_logs (
    id,
    vehicle_id,
    fuel_date,
    mileage,
    liters,
    price_per_liter,
    total_cost,
    station_name,
    is_full_tank
) VALUES
    ('01976000-0001-7000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-05-01', 245000, 42.50, 6.70, 284.75, 'Shell Center', true),
    ('01976000-0001-7000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-05-18', 245520, 38.20, 6.65, 254.03, 'Orlen North', true),
    ('01976000-0001-7000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', DATE '2026-05-03', 50600, 34.00, 6.60, 224.40, 'BP City', true),
    ('01976000-0001-7000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', DATE '2026-05-25', 51200, 33.50, 6.58, 220.43, 'Circle K', true),
    ('01976000-0001-7000-8000-000000000005', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', DATE '2026-05-04', 218000, 50.00, 6.70, 335.00, 'Moya West', true),
    ('01976000-0001-7000-8000-000000000006', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', DATE '2026-05-26', 218500, 47.00, 6.68, 313.96, 'Shell South', true);

INSERT INTO service_records (
    id,
    vehicle_id,
    service_date,
    mileage,
    title,
    description,
    labor_cost,
    total_cost,
    workshop_name
) VALUES
    ('01976000-0010-7000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-04-20', 244800, 'Oil change', 'Engine oil and oil filter replacement.', 120.00, 360.00, 'Auto Service Plus'),
    ('01976000-0010-7000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-05-12', 245300, 'Oxygen sensor replacement', 'Replaced faulty oxygen sensor after high fuel consumption diagnosis.', 180.00, 430.00, 'Auto Service Plus'),
    ('01976000-0010-7000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', DATE '2026-04-28', 50500, 'Annual hybrid inspection', 'Regular inspection of hybrid system and brakes.', 300.00, 650.00, 'Toyota City Service'),
    ('01976000-0010-7000-8000-000000000004', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', DATE '2026-05-10', 218200, 'Front brake replacement', 'Front discs and pads replacement.', 250.00, 950.00, 'BMW Garage');

INSERT INTO mileage_readings (
    vehicle_id,
    reading_date,
    mileage,
    source_type,
    source_id,
    note
) VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-04-01', 244500, 'manual', NULL, 'Initial manual odometer reading.'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', DATE '2026-04-01', 50400, 'manual', NULL, 'Initial manual odometer reading.'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', DATE '2026-04-01', 217700, 'manual', NULL, 'Initial manual odometer reading.');

INSERT INTO service_parts (id, service_record_id, part_id, quantity, unit_price, total_price) VALUES
    ('01976000-0030-7000-8000-000000000001', '01976000-0010-7000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 1.00, 35.00, 35.00),
    ('01976000-0030-7000-8000-000000000002', '01976000-0010-7000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 1.00, 180.00, 180.00),
    ('01976000-0030-7000-8000-000000000003', '01976000-0010-7000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 1.00, 250.00, 250.00),
    ('01976000-0030-7000-8000-000000000004', '01976000-0010-7000-8000-000000000004', 'a1000000-0000-4000-8000-000000000005', 2.00, 210.00, 420.00),
    ('01976000-0030-7000-8000-000000000005', '01976000-0010-7000-8000-000000000004', 'a1000000-0000-4000-8000-000000000006', 1.00, 180.00, 180.00);

INSERT INTO issues (
    id,
    vehicle_id,
    reported_date,
    resolved_date,
    title,
    description,
    status,
    priority,
    related_service_record_id
) VALUES
    ('01976000-0040-7000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-05-01', DATE '2026-05-12', 'High fuel consumption', 'Fuel consumption increased in city traffic.', 'resolved', 'medium', '01976000-0010-7000-8000-000000000002'),
    ('01976000-0040-7000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-05-22', NULL, 'Unstable idle RPM', 'Engine RPM fluctuates when the car is warm.', 'open', 'high', NULL),
    ('01976000-0040-7000-8000-000000000003', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', DATE '2026-05-27', NULL, 'Knocking noise from front suspension', 'Noise is visible on uneven roads.', 'open', 'medium', NULL),
    ('01976000-0040-7000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', DATE '2026-05-29', NULL, 'Hybrid battery check needed', 'Dashboard suggested a hybrid system check.', 'in_progress', 'low', NULL);

INSERT INTO expenses (
    id,
    vehicle_id,
    category_id,
    expense_date,
    amount,
    description,
    source_type,
    source_id
) VALUES
    ('01976000-0050-7000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-01', 284.75, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000001'),
    ('01976000-0050-7000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-18', 254.03, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000002'),
    ('01976000-0050-7000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-03', 224.40, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000003'),
    ('01976000-0050-7000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-25', 220.43, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000004'),
    ('01976000-0050-7000-8000-000000000005', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-04', 335.00, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000005'),
    ('01976000-0050-7000-8000-000000000006', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-26', 313.96, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000006'),
    ('01976000-0050-7000-8000-000000000007', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'f1000000-0000-4000-8000-000000000002', DATE '2026-04-20', 360.00, 'Oil change', 'service_record', '01976000-0010-7000-8000-000000000001'),
    ('01976000-0050-7000-8000-000000000008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'f1000000-0000-4000-8000-000000000002', DATE '2026-05-12', 430.00, 'Oxygen sensor replacement', 'service_record', '01976000-0010-7000-8000-000000000002'),
    ('01976000-0050-7000-8000-000000000009', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'f1000000-0000-4000-8000-000000000002', DATE '2026-04-28', 650.00, 'Annual hybrid inspection', 'service_record', '01976000-0010-7000-8000-000000000003'),
    ('01976000-0050-7000-8000-000000000010', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'f1000000-0000-4000-8000-000000000002', DATE '2026-05-10', 950.00, 'Front brake replacement', 'service_record', '01976000-0010-7000-8000-000000000004'),
    ('01976000-0050-7000-8000-000000000011', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'f1000000-0000-4000-8000-000000000004', DATE '2026-05-30', 1200.00, 'Annual insurance policy', 'manual', NULL),
    ('01976000-0050-7000-8000-000000000012', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'f1000000-0000-4000-8000-000000000005', DATE '2026-05-30', 99.00, 'Technical inspection', 'manual', NULL);

INSERT INTO reminders (
    id,
    vehicle_id,
    title,
    description,
    due_date,
    due_mileage,
    status
) VALUES
    ('01976000-0060-7000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Next oil change', 'Change engine oil after 10000 km or one year.', DATE '2027-04-20', 254800, 'pending'),
    ('01976000-0060-7000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Insurance renewal', 'Renew annual insurance policy.', DATE '2027-05-30', NULL, 'pending'),
    ('01976000-0060-7000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'Technical inspection', 'Book regular technical inspection.', DATE '2027-04-28', NULL, 'pending'),
    ('01976000-0060-7000-8000-000000000004', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Brake check', 'Check front brakes after replacement.', NULL, 225000, 'pending');


-- ============================================================
-- Source: sql/08_demo_calls.sql
-- ============================================================
-- Demo calls for presentation

DO $demo$
DECLARE
    v_mileage_reading_id uuid := NULL;
BEGIN
    CALL add_mileage_reading(
        'cccccccc-cccc-4ccc-8ccc-ccccccccccc3'::uuid,
        DATE '2026-06-09',
        218900,
        'Manual odometer reading before a longer trip.',
        v_mileage_reading_id
    );

    RAISE NOTICE 'Demo mileage reading created with id %.', v_mileage_reading_id;
END;
$demo$;

DO $demo$
DECLARE
    v_fuel_log_id uuid := NULL;
BEGIN
    CALL add_fuel_log(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
        DATE '2026-06-10',
        246050,
        40.00,
        6.55,
        'Orlen Demo',
        true,
        v_fuel_log_id
    );

    RAISE NOTICE 'Demo fuel log created with id %.', v_fuel_log_id;
END;
$demo$;

DO $demo$
DECLARE
    v_service_record_id uuid := NULL;
BEGIN
    CALL add_service_record(
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid,
        DATE '2026-06-11',
        51400,
        'Tire rotation',
        'Seasonal tire rotation and pressure check.',
        160.00,
        160.00,
        'Toyota City Service',
        v_service_record_id
    );

    RAISE NOTICE 'Demo service record created with id %.', v_service_record_id;
END;
$demo$;

DO $demo$
DECLARE
    v_service_record_id uuid := NULL;
BEGIN
    CALL resolve_issue_with_service(
        '01976000-0040-7000-8000-000000000002'::uuid,
        DATE '2026-06-12',
        246120,
        'Throttle body cleaning',
        'Cleaned throttle body and adapted idle values.',
        220.00,
        320.00,
        'Auto Service Plus',
        DATE '2026-06-12',
        v_service_record_id
    );

    RAISE NOTICE 'Issue 2 resolved with service record id %.', v_service_record_id;
END;
$demo$;

-- Explicit transaction for the cursor-based JSON export.
-- Demo simulates user 1 exporting their own vehicle data.
BEGIN;
CALL export_vehicles_to_json('11111111-1111-4111-8111-111111111111'::uuid);
COMMIT;

SELECT * FROM vehicle_summary_view ORDER BY vehicle_id;

SELECT * FROM vehicle_mileage_history_view ORDER BY vehicle_id, reading_date, mileage_reading_id;

SELECT * FROM active_issues_view ORDER BY priority DESC, reported_date;

SELECT calculate_average_fuel_consumption('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid) AS mazda_average_fuel_consumption;

SELECT calculate_total_vehicle_cost('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid) AS mazda_total_cost;

SELECT * FROM get_vehicle_cost_history('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid);

SELECT
    vehicle_id,
    json_data -> 'vehicle' AS exported_vehicle,
    jsonb_array_length(json_data -> 'mileage_readings') AS mileage_reading_count,
    jsonb_array_length(json_data -> 'fuel_logs') AS fuel_log_count,
    jsonb_array_length(json_data -> 'service_records') AS service_record_count,
    jsonb_array_length(json_data -> 'expenses') AS expense_count
FROM vehicle_json_exports
ORDER BY vehicle_id;


