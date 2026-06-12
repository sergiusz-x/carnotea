SET search_path TO vehicle_diary;

SELECT
    'all constraints are validated' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'vehicle_diary'
  AND c.convalidated = false;

SELECT
    'fuel expenses reference existing fuel logs' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM expenses e
WHERE e.source_type = 'fuel_log'
  AND NOT EXISTS (
      SELECT 1
      FROM fuel_logs fl
      WHERE fl.id = e.source_id
        AND fl.vehicle_id = e.vehicle_id
  );

SELECT
    'service expenses reference existing service records' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM expenses e
WHERE e.source_type = 'service_record'
  AND NOT EXISTS (
      SELECT 1
      FROM service_records sr
      WHERE sr.id = e.source_id
        AND sr.vehicle_id = e.vehicle_id
  );

SELECT
    'fuel logs have mileage readings' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM fuel_logs fl
WHERE NOT EXISTS (
    SELECT 1
    FROM mileage_readings mr
    WHERE mr.vehicle_id = fl.vehicle_id
      AND mr.source_type = 'fuel_log'
      AND mr.source_id = fl.id
      AND mr.reading_date = fl.fuel_date
      AND mr.mileage = fl.mileage
);

SELECT
    'service records have mileage readings' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM service_records sr
WHERE NOT EXISTS (
    SELECT 1
    FROM mileage_readings mr
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
    AND NOT EXISTS (
        SELECT 1
        FROM fuel_logs fl
        WHERE fl.id = mr.source_id
          AND fl.vehicle_id = mr.vehicle_id
    )
)
OR (
    mr.source_type = 'service_record'
    AND NOT EXISTS (
        SELECT 1
        FROM service_records sr
        WHERE sr.id = mr.source_id
          AND sr.vehicle_id = mr.vehicle_id
    )
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
WHERE EXISTS (
    SELECT 1
    FROM service_parts sp
    WHERE sp.part_id = p.id
)
AND NOT EXISTS (
    SELECT 1
    FROM part_identifiers pi
    WHERE pi.part_id = p.id
);

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
WHERE i.status = 'resolved'
  AND NOT EXISTS (
      SELECT 1
      FROM service_records sr
      WHERE sr.id = i.related_service_record_id
        AND sr.vehicle_id = i.vehicle_id
  );

SELECT
    'active issues view matches source data' AS check_name,
    abs(
        (SELECT count(*) FROM active_issues_view)
        -
        (
            SELECT count(*)
            FROM issues
            WHERE status IN ('open', 'in_progress')
        )
    ) AS bad_rows,
    (SELECT count(*) FROM active_issues_view) = (
        SELECT count(*)
        FROM issues
        WHERE status IN ('open', 'in_progress')
    ) AS passed;

SELECT
    'total cost function matches expenses' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM vehicles v
WHERE calculate_total_vehicle_cost(v.id) <> (
    SELECT coalesce(sum(amount), 0)
    FROM expenses e
    WHERE e.vehicle_id = v.id
);

SELECT
    'json exports contain required top-level keys' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM vehicle_json_exports
WHERE NOT (
    json_data ? 'vehicle'
    AND json_data ? 'owner'
    AND json_data ? 'mileage_readings'
    AND json_data ? 'fuel_logs'
    AND json_data ? 'service_records'
    AND json_data ? 'issues'
    AND json_data ? 'expenses'
    AND json_data ? 'reminders'
);

SELECT
    'json exports contain arrays for grouped data' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM vehicle_json_exports
WHERE jsonb_typeof(json_data -> 'mileage_readings') <> 'array'
   OR jsonb_typeof(json_data -> 'fuel_logs') <> 'array'
   OR jsonb_typeof(json_data -> 'service_records') <> 'array'
   OR jsonb_typeof(json_data -> 'issues') <> 'array'
   OR jsonb_typeof(json_data -> 'expenses') <> 'array'
   OR jsonb_typeof(json_data -> 'reminders') <> 'array';

SELECT
    'json exported service parts contain identifier arrays' AS check_name,
    count(*) AS bad_rows,
    count(*) = 0 AS passed
FROM vehicle_json_exports vje
WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(vje.json_data -> 'service_records') sr(service_record_json)
    CROSS JOIN LATERAL jsonb_array_elements(sr.service_record_json -> 'parts') p(part_json)
    WHERE jsonb_typeof(p.part_json -> 'identifiers') <> 'array'
);
