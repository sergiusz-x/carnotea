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

-- Replacement for the old CHECK constraint issues_resolved_status_chk.
-- CHECK constraints cannot reference the issue_statuses lookup table, so the
-- "resolved status implies resolved_date" invariant is enforced here instead.
CREATE OR REPLACE FUNCTION enforce_issue_resolved_date()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.resolved_date IS NULL
       AND EXISTS (
           SELECT 1
           FROM issue_statuses
           WHERE id = NEW.status_id
             AND code = 'resolved'
       ) THEN
        RAISE EXCEPTION 'Issue marked as resolved must have a resolved_date.'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_issues_enforce_resolved_date
BEFORE INSERT OR UPDATE ON issues
FOR EACH ROW
EXECUTE FUNCTION enforce_issue_resolved_date();

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
        NULL
    )
    ON CONFLICT (vehicle_id, source_type, source_id) WHERE source_type <> 'manual'
    DO UPDATE SET
        reading_date = EXCLUDED.reading_date,
        mileage = EXCLUDED.mileage;

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
        NULL
    )
    ON CONFLICT (vehicle_id, source_type, source_id) WHERE source_type <> 'manual'
    DO UPDATE SET
        reading_date = EXCLUDED.reading_date,
        mileage = EXCLUDED.mileage;

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

CREATE OR REPLACE FUNCTION sync_charging_session_mileage_reading()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM mileage_readings
        WHERE vehicle_id = OLD.vehicle_id
          AND source_type = 'charging_session'
          AND source_id = OLD.id;

        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
            DELETE FROM mileage_readings
            WHERE vehicle_id = OLD.vehicle_id
              AND source_type = 'charging_session'
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
        NEW.charge_date,
        NEW.mileage,
        'charging_session',
        NEW.id,
        NULL
    )
    ON CONFLICT (vehicle_id, source_type, source_id) WHERE source_type <> 'manual'
    DO UPDATE SET
        reading_date = EXCLUDED.reading_date,
        mileage = EXCLUDED.mileage;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_charging_sessions_sync_mileage_reading
AFTER INSERT OR UPDATE OF vehicle_id, charge_date, mileage ON charging_sessions
FOR EACH ROW
EXECUTE FUNCTION sync_charging_session_mileage_reading();

CREATE TRIGGER trg_charging_sessions_delete_mileage_reading
AFTER DELETE ON charging_sessions
FOR EACH ROW
EXECUTE FUNCTION sync_charging_session_mileage_reading();

-- fuel_type='electric' → tylko charging_sessions; 'petrol'/'diesel'/'lpg' → tylko fuel_logs;
-- 'hybrid'/'other' → oba dozwolone.
CREATE OR REPLACE FUNCTION enforce_vehicle_energy_source()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_fuel_code varchar(30);
BEGIN
    SELECT ft.code INTO v_fuel_code
    FROM vehicles v
    JOIN fuel_types ft ON ft.id = v.fuel_type_id
    WHERE v.id = NEW.vehicle_id;

    IF TG_TABLE_NAME = 'fuel_logs' AND v_fuel_code = 'electric' THEN
        RAISE EXCEPTION 'Electric vehicles cannot have fuel logs; use charging sessions instead.';
    END IF;

    IF TG_TABLE_NAME = 'charging_sessions' AND v_fuel_code IN ('petrol', 'diesel', 'lpg') THEN
        RAISE EXCEPTION 'ICE-only vehicles cannot have charging sessions; use fuel logs instead.';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_fuel_logs_enforce_energy_source
BEFORE INSERT ON fuel_logs
FOR EACH ROW
EXECUTE FUNCTION enforce_vehicle_energy_source();

CREATE TRIGGER trg_charging_sessions_enforce_energy_source
BEFORE INSERT ON charging_sessions
FOR EACH ROW
EXECUTE FUNCTION enforce_vehicle_energy_source();

CREATE OR REPLACE FUNCTION sync_fuel_log_expense()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM expenses WHERE source_type = 'fuel_log' AND source_id = OLD.id;
        RETURN OLD;
    END IF;

    UPDATE expenses
    SET amount       = NEW.total_cost,
        expense_date = NEW.fuel_date,
        vehicle_id   = NEW.vehicle_id
    WHERE source_type = 'fuel_log' AND source_id = NEW.id;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_fuel_logs_sync_expense
AFTER UPDATE OF vehicle_id, fuel_date, total_cost ON fuel_logs
FOR EACH ROW EXECUTE FUNCTION sync_fuel_log_expense();

CREATE TRIGGER trg_fuel_logs_delete_expense
AFTER DELETE ON fuel_logs
FOR EACH ROW EXECUTE FUNCTION sync_fuel_log_expense();

CREATE OR REPLACE FUNCTION sync_charging_session_expense()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM expenses WHERE source_type = 'charging_session' AND source_id = OLD.id;
        RETURN OLD;
    END IF;

    UPDATE expenses
    SET amount       = NEW.total_cost,
        expense_date = NEW.charge_date,
        vehicle_id   = NEW.vehicle_id
    WHERE source_type = 'charging_session' AND source_id = NEW.id;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_charging_sessions_sync_expense
AFTER UPDATE OF vehicle_id, charge_date, total_cost ON charging_sessions
FOR EACH ROW EXECUTE FUNCTION sync_charging_session_expense();

CREATE TRIGGER trg_charging_sessions_delete_expense
AFTER DELETE ON charging_sessions
FOR EACH ROW EXECUTE FUNCTION sync_charging_session_expense();

CREATE OR REPLACE FUNCTION sync_service_record_expense()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_category_id uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM expenses WHERE source_type = 'service_record' AND source_id = OLD.id;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.total_cost > 0 THEN
            IF EXISTS (SELECT 1 FROM expenses WHERE source_type = 'service_record' AND source_id = NEW.id) THEN
                UPDATE expenses
                SET amount       = NEW.total_cost,
                    expense_date = NEW.service_date,
                    vehicle_id   = NEW.vehicle_id,
                    description  = trim(NEW.title)
                WHERE source_type = 'service_record' AND source_id = NEW.id;
            ELSE
                SELECT id INTO v_category_id FROM expense_categories WHERE code = 'service';
                INSERT INTO expenses (vehicle_id, category_id, expense_date, amount, description, source_type, source_id)
                VALUES (NEW.vehicle_id, v_category_id, NEW.service_date, NEW.total_cost, trim(NEW.title), 'service_record', NEW.id);
            END IF;
        ELSE
            DELETE FROM expenses WHERE source_type = 'service_record' AND source_id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_service_records_sync_expense
AFTER UPDATE OF vehicle_id, service_date, total_cost, title ON service_records
FOR EACH ROW EXECUTE FUNCTION sync_service_record_expense();

CREATE TRIGGER trg_service_records_delete_expense
AFTER DELETE ON service_records
FOR EACH ROW EXECUTE FUNCTION sync_service_record_expense();
