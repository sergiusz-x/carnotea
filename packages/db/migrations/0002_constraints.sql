-- enforce_vehicle_energy_source
-- Prevents electric vehicles from having fuel logs and ICE-only vehicles
-- from having charging sessions. Enforced at DB level to protect against
-- direct psql writes that bypass the API.
CREATE OR REPLACE FUNCTION enforce_vehicle_energy_source()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
$$;

CREATE TRIGGER trg_fuel_logs_enforce_energy_source
BEFORE INSERT ON fuel_logs
FOR EACH ROW EXECUTE FUNCTION enforce_vehicle_energy_source();

CREATE TRIGGER trg_charging_sessions_enforce_energy_source
BEFORE INSERT ON charging_sessions
FOR EACH ROW EXECUTE FUNCTION enforce_vehicle_energy_source();

-- enforce_issue_resolved_date
-- A resolved issue must have a resolved_date. CHECK constraints cannot
-- reference lookup tables, so a trigger is the only correct implementation.
CREATE OR REPLACE FUNCTION enforce_issue_resolved_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
$$;

CREATE TRIGGER trg_issues_enforce_resolved_date
BEFORE INSERT OR UPDATE ON issues
FOR EACH ROW EXECUTE FUNCTION enforce_issue_resolved_date();
