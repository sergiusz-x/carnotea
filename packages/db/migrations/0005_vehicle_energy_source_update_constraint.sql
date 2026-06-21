-- Keep vehicle energy-source invariants true when existing rows are updated.
--
-- 0002_constraints protected inserts into fuel_logs / charging_sessions. This
-- extends that direct-write protection to child vehicle_id updates and to
-- vehicles.fuel_type_id updates.

DROP TRIGGER IF EXISTS trg_fuel_logs_enforce_energy_source ON fuel_logs;
CREATE TRIGGER trg_fuel_logs_enforce_energy_source
BEFORE INSERT OR UPDATE OF vehicle_id ON fuel_logs
FOR EACH ROW EXECUTE FUNCTION enforce_vehicle_energy_source();

DROP TRIGGER IF EXISTS trg_charging_sessions_enforce_energy_source ON charging_sessions;
CREATE TRIGGER trg_charging_sessions_enforce_energy_source
BEFORE INSERT OR UPDATE OF vehicle_id ON charging_sessions
FOR EACH ROW EXECUTE FUNCTION enforce_vehicle_energy_source();

CREATE OR REPLACE FUNCTION enforce_vehicle_energy_source_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_fuel_code varchar(30);
BEGIN
  IF NEW.fuel_type_id IS NOT DISTINCT FROM OLD.fuel_type_id THEN
    RETURN NEW;
  END IF;

  SELECT ft.code INTO v_fuel_code
  FROM fuel_types ft
  WHERE ft.id = NEW.fuel_type_id;

  IF v_fuel_code = 'electric'
     AND EXISTS (SELECT 1 FROM fuel_logs fl WHERE fl.vehicle_id = NEW.id) THEN
    RAISE EXCEPTION 'Vehicles with fuel logs cannot be changed to electric.'
      USING ERRCODE = 'check_violation',
            CONSTRAINT = 'vehicles_energy_source_change_chk';
  END IF;

  IF v_fuel_code IN ('petrol', 'diesel', 'lpg')
     AND EXISTS (SELECT 1 FROM charging_sessions cs WHERE cs.vehicle_id = NEW.id) THEN
    RAISE EXCEPTION 'Vehicles with charging sessions cannot be changed to an ICE-only fuel type.'
      USING ERRCODE = 'check_violation',
            CONSTRAINT = 'vehicles_energy_source_change_chk';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vehicles_enforce_energy_source_change
BEFORE UPDATE OF fuel_type_id ON vehicles
FOR EACH ROW EXECUTE FUNCTION enforce_vehicle_energy_source_change();
