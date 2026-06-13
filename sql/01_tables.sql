-- Tables and relations

CREATE TABLE fuel_types (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code varchar(30) NOT NULL UNIQUE,
    sort_order smallint NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE part_identifier_types (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code varchar(40) NOT NULL UNIQUE,
    sort_order smallint NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE issue_statuses (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code varchar(30) NOT NULL UNIQUE,
    is_terminal boolean NOT NULL DEFAULT false,
    sort_order smallint NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE issue_priorities (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code varchar(30) NOT NULL UNIQUE,
    weight smallint NOT NULL,
    sort_order smallint NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT issue_priorities_weight_uq UNIQUE (weight)
);

CREATE TABLE reminder_statuses (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code varchar(30) NOT NULL UNIQUE,
    is_terminal boolean NOT NULL DEFAULT false,
    sort_order smallint NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE charger_types (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code varchar(40) NOT NULL UNIQUE,
    max_kw numeric(6, 1),
    sort_order smallint NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true
);

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
    fuel_type_id smallint NOT NULL REFERENCES fuel_types(id) ON DELETE RESTRICT,
    vin varchar(17) UNIQUE,
    registration_number varchar(20) UNIQUE,
    current_mileage integer NOT NULL DEFAULT 0,
    currency_code varchar(3) NOT NULL DEFAULT 'EUR',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT vehicles_production_year_chk CHECK (
        production_year BETWEEN 1950 AND (EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1)
    ),
    CONSTRAINT vehicles_vin_length_chk CHECK (vin IS NULL OR length(vin) = 17),
    CONSTRAINT vehicles_current_mileage_chk CHECK (current_mileage >= 0),
    CONSTRAINT vehicles_currency_code_chk CHECK (char_length(currency_code) = 3)
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
        source_type IN ('manual', 'fuel_log', 'service_record', 'charging_session')
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

CREATE TABLE charging_sessions (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    charge_date date NOT NULL,
    mileage integer NOT NULL,
    energy_kwh numeric(8, 2) NOT NULL,
    price_per_kwh numeric(8, 2) NOT NULL,
    total_cost numeric(10, 2) NOT NULL,
    charger_type_id smallint NOT NULL REFERENCES charger_types(id) ON DELETE RESTRICT,
    soc_start_percent smallint,
    soc_end_percent smallint,
    station_name varchar(120),
    is_full_charge boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT charging_sessions_mileage_chk CHECK (mileage >= 0),
    CONSTRAINT charging_sessions_energy_kwh_chk CHECK (energy_kwh > 0),
    CONSTRAINT charging_sessions_price_per_kwh_chk CHECK (price_per_kwh > 0),
    CONSTRAINT charging_sessions_total_cost_chk CHECK (total_cost = round(energy_kwh * price_per_kwh, 2)),
    CONSTRAINT charging_sessions_soc_start_chk CHECK (soc_start_percent IS NULL OR soc_start_percent BETWEEN 0 AND 100),
    CONSTRAINT charging_sessions_soc_end_chk CHECK (soc_end_percent IS NULL OR soc_end_percent BETWEEN 0 AND 100),
    CONSTRAINT charging_sessions_soc_order_chk CHECK (
        soc_start_percent IS NULL OR soc_end_percent IS NULL OR soc_start_percent < soc_end_percent
    )
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
    identifier_type_id smallint NOT NULL REFERENCES part_identifier_types(id) ON DELETE RESTRICT,
    source_name varchar(120) NOT NULL,
    identifier_value varchar(120) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT part_identifiers_source_name_chk CHECK (length(trim(source_name)) > 0),
    CONSTRAINT part_identifiers_value_chk CHECK (length(trim(identifier_value)) > 0),
    CONSTRAINT part_identifiers_part_type_source_value_uq UNIQUE (
        part_id,
        identifier_type_id,
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
    status_id smallint NOT NULL REFERENCES issue_statuses(id) ON DELETE RESTRICT,
    priority_id smallint NOT NULL REFERENCES issue_priorities(id) ON DELETE RESTRICT,
    related_service_record_id uuid REFERENCES service_records(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT issues_resolved_date_chk CHECK (resolved_date IS NULL OR resolved_date >= reported_date)
);

CREATE TABLE expense_categories (
    id uuid DEFAULT public.gen_random_uuid() PRIMARY KEY,
    -- code identifies system categories used by procedures; NULL for user-defined categories
    code varchar(40) UNIQUE,
    name varchar(60) NOT NULL UNIQUE
);

CREATE TABLE expenses (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    expense_date date NOT NULL,
    amount numeric(10, 2) NOT NULL,
    -- NULL for auto-generated expenses (source_type + source_id already provide context)
    description text,
    source_type varchar(40) NOT NULL DEFAULT 'manual',
    source_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT expenses_amount_chk CHECK (amount >= 0),
    CONSTRAINT expenses_source_type_chk CHECK (
        source_type IN ('fuel_log', 'service_record', 'manual', 'other', 'charging_session')
    )
);

CREATE TABLE reminders (
    id uuid DEFAULT generate_uuid_v7() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    title varchar(160) NOT NULL,
    description text,
    due_date date,
    due_mileage integer,
    status_id smallint NOT NULL REFERENCES reminder_statuses(id) ON DELETE RESTRICT,
    notified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reminders_due_mileage_chk CHECK (due_mileage IS NULL OR due_mileage >= 0),
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
