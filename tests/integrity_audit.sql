-- Integrity audit for the @carnotea/db schema (public schema, Drizzle-managed).
-- Run against a fresh database after pnpm db:migrate + seed data.
-- All checks should return passed = true on an empty database.

SELECT
    'all constraints are validated' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public'
  AND c.convalidated = false;

SELECT
    'fuel expenses reference existing fuel logs' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM expenses e
WHERE e.source_type = 'fuel_log'
  AND NOT EXISTS (
      SELECT 1 FROM fuel_logs fl
      WHERE fl.id = e.source_id AND fl.vehicle_id = e.vehicle_id
  );

SELECT
    'service expenses reference existing service records' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM expenses e
WHERE e.source_type = 'service_record'
  AND NOT EXISTS (
      SELECT 1 FROM service_records sr
      WHERE sr.id = e.source_id AND sr.vehicle_id = e.vehicle_id
  );

SELECT
    'charging expenses reference existing charging sessions' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM expenses e
WHERE e.source_type = 'charging_session'
  AND NOT EXISTS (
      SELECT 1 FROM charging_sessions cs
      WHERE cs.id = e.source_id AND cs.vehicle_id = e.vehicle_id
  );

SELECT
    'fuel logs have mileage readings' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM fuel_logs fl
WHERE NOT EXISTS (
    SELECT 1 FROM mileage_readings mr
    WHERE mr.vehicle_id = fl.vehicle_id
      AND mr.source_type = 'fuel_log'
      AND mr.source_id = fl.id
      AND mr.reading_date = fl.fuel_date
      AND mr.mileage = fl.mileage
);

SELECT
    'charging sessions have mileage readings' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM charging_sessions cs
WHERE NOT EXISTS (
    SELECT 1 FROM mileage_readings mr
    WHERE mr.vehicle_id = cs.vehicle_id
      AND mr.source_type = 'charging_session'
      AND mr.source_id = cs.id
      AND mr.reading_date = cs.charge_date
      AND mr.mileage = cs.mileage
);

SELECT
    'service records have mileage readings' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM service_records sr
WHERE NOT EXISTS (
    SELECT 1 FROM mileage_readings mr
    WHERE mr.vehicle_id = sr.vehicle_id
      AND mr.source_type = 'service_record'
      AND mr.source_id = sr.id
      AND mr.reading_date = sr.service_date
      AND mr.mileage = sr.mileage
);

SELECT
    'mileage reading sources reference existing rows' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM mileage_readings mr
WHERE (
    mr.source_type = 'fuel_log'
    AND NOT EXISTS (SELECT 1 FROM fuel_logs fl WHERE fl.id = mr.source_id AND fl.vehicle_id = mr.vehicle_id)
)
OR (
    mr.source_type = 'service_record'
    AND NOT EXISTS (SELECT 1 FROM service_records sr WHERE sr.id = mr.source_id AND sr.vehicle_id = mr.vehicle_id)
)
OR (
    mr.source_type = 'charging_session'
    AND NOT EXISTS (SELECT 1 FROM charging_sessions cs WHERE cs.id = mr.source_id AND cs.vehicle_id = mr.vehicle_id)
);

SELECT
    'vehicle current mileage matches readings' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM vehicles v
WHERE v.current_mileage <> (
    SELECT coalesce(max(mr.mileage), 0)
    FROM mileage_readings mr
    WHERE mr.vehicle_id = v.id
);

SELECT
    'service part totals are consistent' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM service_parts
WHERE total_price <> round(quantity * unit_price, 2);

SELECT
    'all used parts have identifiers' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM parts p
WHERE EXISTS (SELECT 1 FROM service_parts sp WHERE sp.part_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM part_identifiers pi WHERE pi.part_id = p.id);

SELECT
    'part identifier values are not blank' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM part_identifiers
WHERE length(trim(source_name)) = 0
   OR length(trim(identifier_value)) = 0;

SELECT
    'resolved issues have linked service records' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM issues i
JOIN issue_statuses s ON s.id = i.status_id
WHERE s.code = 'resolved'
  AND NOT EXISTS (
      SELECT 1 FROM service_records sr
      WHERE sr.id = i.related_service_record_id AND sr.vehicle_id = i.vehicle_id
  );

SELECT
    'electric vehicles have no fuel logs' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM fuel_logs fl
JOIN vehicles v ON v.id = fl.vehicle_id
JOIN fuel_types ft ON ft.id = v.fuel_type_id
WHERE ft.code = 'electric';

SELECT
    'ice-only vehicles have no charging sessions' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM charging_sessions cs
JOIN vehicles v ON v.id = cs.vehicle_id
JOIN fuel_types ft ON ft.id = v.fuel_type_id
WHERE ft.code IN ('petrol', 'diesel', 'lpg');

SELECT
    'fuel log expense amounts are consistent' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM expenses e
JOIN fuel_logs fl ON fl.id = e.source_id AND fl.vehicle_id = e.vehicle_id
WHERE e.source_type = 'fuel_log'
  AND e.amount <> fl.total_cost;

SELECT
    'charging session expense amounts are consistent' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM expenses e
JOIN charging_sessions cs ON cs.id = e.source_id AND cs.vehicle_id = e.vehicle_id
WHERE e.source_type = 'charging_session'
  AND e.amount <> cs.total_cost;
