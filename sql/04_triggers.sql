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
