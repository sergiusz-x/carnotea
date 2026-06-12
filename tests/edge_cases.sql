SET search_path TO vehicle_diary;

-- Expected error: vehicle does not exist.
DO $test$
DECLARE
    v_fuel_log_id uuid := NULL;
BEGIN
    BEGIN
        CALL add_fuel_log(
            '99999999-9999-4999-8999-999999999999'::uuid,
            DATE '2026-06-20',
            1000,
            10.00,
            6.00,
            'Invalid Station',
            true,
            v_fuel_log_id
        );

        RAISE EXCEPTION 'Expected add_fuel_log to reject missing vehicle.';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE 'Expected add_fuel_log%' THEN
                RAISE;
            END IF;

            RAISE NOTICE 'Expected error captured: %', SQLERRM;
    END;
END;
$test$;

-- Expected error: negative liters.
DO $test$
DECLARE
    v_fuel_log_id uuid := NULL;
BEGIN
    BEGIN
        CALL add_fuel_log(
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
            DATE '2026-06-20',
            246500,
            -1.00,
            6.00,
            'Invalid Station',
            true,
            v_fuel_log_id
        );

        RAISE EXCEPTION 'Expected add_fuel_log to reject negative liters.';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE 'Expected add_fuel_log%' THEN
                RAISE;
            END IF;

            RAISE NOTICE 'Expected error captured: %', SQLERRM;
    END;
END;
$test$;

-- Expected error: negative manual mileage reading.
DO $test$
DECLARE
    v_mileage_reading_id uuid := NULL;
BEGIN
    BEGIN
        CALL add_mileage_reading(
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
            DATE '2026-06-20',
            -10,
            'Invalid manual odometer reading.',
            v_mileage_reading_id
        );

        RAISE EXCEPTION 'Expected add_mileage_reading to reject negative mileage.';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE 'Expected add_mileage_reading%' THEN
                RAISE;
            END IF;

            RAISE NOTICE 'Expected error captured: %', SQLERRM;
    END;
END;
$test$;

-- Verify manual mileage readings update the current vehicle mileage.
BEGIN;

DO $test$
DECLARE
    v_mileage_reading_id uuid := NULL;
    v_current_mileage integer;
BEGIN
    CALL add_mileage_reading(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
        DATE '2026-06-23',
        246800,
        'Manual odometer reading for test.',
        v_mileage_reading_id
    );

    SELECT current_mileage INTO v_current_mileage
    FROM vehicles
    WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

    IF v_current_mileage <> 246800 THEN
        RAISE EXCEPTION 'Manual mileage reading did not update current mileage. Current: %', v_current_mileage;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM mileage_readings
        WHERE id = v_mileage_reading_id
          AND source_type = 'manual'
    ) THEN
        RAISE EXCEPTION 'Manual mileage reading was not saved.';
    END IF;

    RAISE NOTICE 'Manual mileage reading verified.';
END;
$test$;

ROLLBACK;

-- Expected error: duplicate part identifier for the same part.
DO $test$
BEGIN
    BEGIN
        INSERT INTO part_identifiers (
            part_id,
            identifier_type,
            source_name,
            identifier_value
        )
        VALUES (
            'a1000000-0000-4000-8000-000000000001',
            'manufacturer_number',
            'Bosch',
            '0258006028'
        );

        RAISE EXCEPTION 'Expected part_identifiers to reject duplicate identifier.';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE 'Expected part_identifiers%' THEN
                RAISE;
            END IF;

            RAISE NOTICE 'Expected error captured: %', SQLERRM;
    END;
END;
$test$;

-- Expected error: already resolved issue.
DO $test$
DECLARE
    v_service_record_id uuid := NULL;
BEGIN
    BEGIN
        CALL resolve_issue_with_service(
            '01976000-0040-7000-8000-000000000001'::uuid,
            DATE '2026-06-21',
            246600,
            'Duplicate repair',
            'This should not be created.',
            100.00,
            100.00,
            'Invalid Workshop',
            DATE '2026-06-21',
            v_service_record_id
        );

        RAISE EXCEPTION 'Expected resolve_issue_with_service to reject resolved issue.';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE 'Expected resolve_issue%' THEN
                RAISE;
            END IF;

            RAISE NOTICE 'Expected error captured: %', SQLERRM;
    END;
END;
$test$;

-- Verify expense update audit trigger.
BEGIN;

DO $test$
DECLARE
    v_before integer;
    v_after integer;
BEGIN
    SELECT count(*) INTO v_before
    FROM audit_logs
    WHERE table_name = 'expenses'
      AND operation = 'UPDATE';

    UPDATE expenses
    SET amount = amount + 1.00
    WHERE id = '01976000-0050-7000-8000-000000000001';

    SELECT count(*) INTO v_after
    FROM audit_logs
    WHERE table_name = 'expenses'
      AND operation = 'UPDATE';

    IF v_after <= v_before THEN
        RAISE EXCEPTION 'Expense update audit trigger did not write a log.';
    END IF;

    RAISE NOTICE 'Expense update audit trigger verified.';
END;
$test$;

ROLLBACK;

-- Verify service delete audit trigger on temporary data.
BEGIN;

DO $test$
DECLARE
    v_service_record_id uuid := NULL;
    v_before integer;
    v_after integer;
BEGIN
    SELECT count(*) INTO v_before
    FROM audit_logs
    WHERE table_name = 'service_records'
      AND operation = 'DELETE';

    CALL add_service_record(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
        DATE '2026-06-22',
        246700,
        'Temporary service for delete trigger test',
        'This record is created only for trigger verification.',
        10.00,
        10.00,
        'Test Workshop',
        v_service_record_id
    );

    DELETE FROM service_records
    WHERE id = v_service_record_id;

    IF EXISTS (
        SELECT 1
        FROM mileage_readings
        WHERE source_type = 'service_record'
          AND source_id = v_service_record_id
    ) THEN
        RAISE EXCEPTION 'Service mileage reading was not removed with deleted service record.';
    END IF;

    SELECT count(*) INTO v_after
    FROM audit_logs
    WHERE table_name = 'service_records'
      AND operation = 'DELETE';

    IF v_after <= v_before THEN
        RAISE EXCEPTION 'Service delete audit trigger did not write a log.';
    END IF;

    RAISE NOTICE 'Service delete audit trigger verified.';
END;
$test$;

ROLLBACK;

-- Expected error: JSON export rejects missing user.
DO $test$
BEGIN
    BEGIN
        CALL export_vehicles_to_json('99999999-9999-4999-8999-999999999999'::uuid);

        RAISE EXCEPTION 'Expected export_vehicles_to_json to reject missing user.';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE 'Expected export_vehicles_to_json%' THEN
                RAISE;
            END IF;

            RAISE NOTICE 'Expected error captured: %', SQLERRM;
    END;
END;
$test$;

-- Verify JSON export produced one row per selected user's vehicle.
BEGIN;
CALL export_vehicles_to_json('22222222-2222-4222-8222-222222222222'::uuid);

DO $test$
DECLARE
    v_user_vehicle_count integer;
    v_user_export_count integer;
    v_other_user_export_count integer;
BEGIN
    SELECT count(*) INTO v_user_vehicle_count
    FROM vehicles
    WHERE user_id = '22222222-2222-4222-8222-222222222222';

    SELECT count(*) INTO v_user_export_count
    FROM vehicle_json_exports vje
    JOIN vehicles v ON v.id = vje.vehicle_id
    WHERE v.user_id = '22222222-2222-4222-8222-222222222222';

    IF v_user_vehicle_count <> v_user_export_count THEN
        RAISE EXCEPTION 'JSON export count mismatch for user 2. Vehicles: %, exports: %', v_user_vehicle_count, v_user_export_count;
    END IF;

    SELECT count(*) INTO v_other_user_export_count
    FROM vehicle_json_exports vje
    JOIN vehicles v ON v.id = vje.vehicle_id
    WHERE v.user_id = '11111111-1111-4111-8111-111111111111';

    IF v_other_user_export_count <> (
        SELECT count(*)
        FROM vehicles
        WHERE user_id = '11111111-1111-4111-8111-111111111111'
    ) THEN
        RAISE EXCEPTION 'Export for user 2 unexpectedly removed user 1 exports.';
    END IF;

    RAISE NOTICE 'User JSON export count verified.';
END;
$test$;

ROLLBACK;
