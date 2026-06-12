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
