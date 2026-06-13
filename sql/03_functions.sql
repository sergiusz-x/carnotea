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

CREATE OR REPLACE FUNCTION calculate_average_energy_consumption(p_vehicle_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $function$
DECLARE
    v_result numeric(8, 2);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = p_vehicle_id) THEN
        RAISE EXCEPTION 'Vehicle with id % does not exist.', p_vehicle_id;
    END IF;

    WITH ordered_sessions AS (
        SELECT
            mileage,
            energy_kwh,
            mileage - lag(mileage) OVER (ORDER BY mileage, charge_date, id) AS distance_km
        FROM charging_sessions
        WHERE vehicle_id = p_vehicle_id
          AND is_full_charge = true
    )
    SELECT round(avg((energy_kwh / distance_km) * 100), 2)
    INTO v_result
    FROM ordered_sessions
    WHERE distance_km > 0;

    RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION get_vehicle_cost_history(p_vehicle_id uuid)
RETURNS TABLE (
    cost_date date,
    category_name varchar,
    amount numeric,
    description text,
    source_type varchar,
    currency_code varchar
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
        e.source_type,
        v.currency_code
    FROM expenses e
    JOIN expense_categories c ON c.id = e.category_id
    JOIN vehicles v ON v.id = e.vehicle_id
    WHERE e.vehicle_id = p_vehicle_id
    ORDER BY e.expense_date, e.id;
END;
$function$;
