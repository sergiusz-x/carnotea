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

    SELECT id INTO v_category_id FROM expense_categories WHERE code = 'fuel';

    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Expense category with code "fuel" does not exist.';
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

    INSERT INTO expenses (vehicle_id, category_id, expense_date, amount, source_type, source_id)
    VALUES (p_vehicle_id, v_category_id, p_fuel_date, v_total_cost, 'fuel_log', p_fuel_log_id);

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'add_fuel_log failed: %', SQLERRM
            USING ERRCODE = SQLSTATE;
END;
$procedure$;

CREATE OR REPLACE PROCEDURE add_charging_session(
    IN p_vehicle_id uuid,
    IN p_charge_date date,
    IN p_mileage integer,
    IN p_energy_kwh numeric,
    IN p_price_per_kwh numeric,
    IN p_charger_type_id smallint,
    IN p_soc_start_percent smallint DEFAULT NULL,
    IN p_soc_end_percent smallint DEFAULT NULL,
    IN p_station_name text DEFAULT NULL,
    IN p_is_full_charge boolean DEFAULT true,
    INOUT p_charging_session_id uuid DEFAULT NULL
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

    IF p_charge_date IS NULL THEN
        RAISE EXCEPTION 'Charge date is required.';
    END IF;

    IF p_mileage IS NULL OR p_mileage < 0 THEN
        RAISE EXCEPTION 'Mileage must be greater than or equal to 0.';
    END IF;

    IF p_energy_kwh IS NULL OR p_energy_kwh <= 0 THEN
        RAISE EXCEPTION 'Energy must be greater than 0 kWh.';
    END IF;

    IF p_price_per_kwh IS NULL OR p_price_per_kwh <= 0 THEN
        RAISE EXCEPTION 'Price per kWh must be greater than 0.';
    END IF;

    SELECT id INTO v_category_id FROM expense_categories WHERE code = 'electricity';

    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Expense category with code "electricity" does not exist.';
    END IF;

    v_total_cost := round(p_energy_kwh * p_price_per_kwh, 2);

    INSERT INTO charging_sessions (
        vehicle_id,
        charge_date,
        mileage,
        energy_kwh,
        price_per_kwh,
        total_cost,
        charger_type_id,
        soc_start_percent,
        soc_end_percent,
        station_name,
        is_full_charge
    )
    VALUES (
        p_vehicle_id,
        p_charge_date,
        p_mileage,
        p_energy_kwh,
        p_price_per_kwh,
        v_total_cost,
        p_charger_type_id,
        p_soc_start_percent,
        p_soc_end_percent,
        p_station_name,
        coalesce(p_is_full_charge, true)
    )
    RETURNING id INTO p_charging_session_id;

    INSERT INTO expenses (vehicle_id, category_id, expense_date, amount, source_type, source_id)
    VALUES (p_vehicle_id, v_category_id, p_charge_date, v_total_cost, 'charging_session', p_charging_session_id);

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'add_charging_session failed: %', SQLERRM
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

    SELECT id INTO v_category_id FROM expense_categories WHERE code = 'service';

    IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Expense category with code "service" does not exist.';
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
        INSERT INTO expenses (vehicle_id, category_id, expense_date, amount, description, source_type, source_id)
        VALUES (p_vehicle_id, v_category_id, p_service_date, v_total_cost, trim(p_title), 'service_record', p_service_record_id);
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'add_service_record failed: %', SQLERRM
            USING ERRCODE = SQLSTATE;
END;
$procedure$;

CREATE OR REPLACE PROCEDURE resolve_issue(
    IN p_issue_id uuid,
    IN p_resolved_date date DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_vehicle_id uuid;
    v_issue_status varchar(30);
    v_resolved_status_id smallint;
BEGIN
    SELECT i.vehicle_id, s.code
    INTO v_vehicle_id, v_issue_status
    FROM issues i
    JOIN issue_statuses s ON s.id = i.status_id
    WHERE i.id = p_issue_id
    FOR UPDATE OF i;

    IF v_vehicle_id IS NULL THEN
        RAISE EXCEPTION 'Issue with id % does not exist.', p_issue_id;
    END IF;

    IF v_issue_status = 'resolved' THEN
        RAISE EXCEPTION 'Issue with id % is already resolved.', p_issue_id;
    END IF;

    SELECT id INTO v_resolved_status_id FROM issue_statuses WHERE code = 'resolved';

    UPDATE issues
    SET status_id     = v_resolved_status_id,
        resolved_date = coalesce(p_resolved_date, CURRENT_DATE)
    WHERE id = p_issue_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'resolve_issue failed: %', SQLERRM
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
    v_resolved_status_id smallint;
BEGIN
    SELECT i.vehicle_id, s.code
    INTO v_vehicle_id, v_issue_status
    FROM issues i
    JOIN issue_statuses s ON s.id = i.status_id
    WHERE i.id = p_issue_id
    FOR UPDATE OF i;

    IF v_vehicle_id IS NULL THEN
        RAISE EXCEPTION 'Issue with id % does not exist.', p_issue_id;
    END IF;

    IF v_issue_status = 'resolved' THEN
        RAISE EXCEPTION 'Issue with id % is already resolved.', p_issue_id;
    END IF;

    SELECT id INTO v_resolved_status_id
    FROM issue_statuses
    WHERE code = 'resolved';

    IF v_resolved_status_id IS NULL THEN
        RAISE EXCEPTION 'Issue status "resolved" is not defined in issue_statuses.';
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
        status_id = v_resolved_status_id,
        resolved_date = coalesce(p_resolved_date, p_service_date),
        related_service_record_id = p_service_record_id
    WHERE id = p_issue_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'resolve_issue_with_service failed: %', SQLERRM
            USING ERRCODE = SQLSTATE;
END;
$procedure$;

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
            ft.code AS fuel_type,
            v.currency_code,
            v.vin,
            v.registration_number,
            v.current_mileage,
            u.id AS owner_id,
            u.first_name,
            u.last_name,
            u.email
        FROM vehicles v
        JOIN users u ON u.id = v.user_id
        JOIN fuel_types ft ON ft.id = v.fuel_type_id
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
                'currency_code', v_vehicle.currency_code,
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
            'charging_sessions', coalesce((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'charge_date', cs.charge_date,
                        'mileage', cs.mileage,
                        'energy_kwh', cs.energy_kwh,
                        'price_per_kwh', cs.price_per_kwh,
                        'total_cost', cs.total_cost,
                        'charger_type', ct.code,
                        'soc_start_percent', cs.soc_start_percent,
                        'soc_end_percent', cs.soc_end_percent,
                        'station_name', cs.station_name,
                        'is_full_charge', cs.is_full_charge
                    )
                    ORDER BY cs.charge_date, cs.id
                )
                FROM charging_sessions cs
                JOIN charger_types ct ON ct.id = cs.charger_type_id
                WHERE cs.vehicle_id = v_vehicle.vehicle_id
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
                                                'type', pit.code,
                                                'source_name', pi.source_name,
                                                'value', pi.identifier_value
                                            )
                                            ORDER BY pit.code, pi.source_name, pi.identifier_value
                                        )
                                        FROM part_identifiers pi
                                        JOIN part_identifier_types pit ON pit.id = pi.identifier_type_id
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
                        'status', s.code,
                        'priority', pr.code,
                        'related_service_record_id', i.related_service_record_id
                    )
                    ORDER BY i.reported_date, i.id
                )
                FROM issues i
                JOIN issue_statuses s ON s.id = i.status_id
                JOIN issue_priorities pr ON pr.id = i.priority_id
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
                        'status', rs.code
                    )
                    ORDER BY r.due_date NULLS LAST, r.due_mileage NULLS LAST, r.id
                )
                FROM reminders r
                JOIN reminder_statuses rs ON rs.id = r.status_id
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
