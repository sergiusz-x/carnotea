SET search_path TO vehicle_diary;

SELECT
    'base tables' AS requirement,
    count(*) AS actual,
    'at least 5' AS expected,
    count(*) >= 5 AS passed
FROM information_schema.tables
WHERE table_schema = 'vehicle_diary'
  AND table_type = 'BASE TABLE';

SELECT
    'procedures' AS requirement,
    count(*) AS actual,
    'at least 3' AS expected,
    count(*) >= 3 AS passed
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'vehicle_diary'
  AND p.prokind = 'p';

SELECT
    'scalar/table functions' AS requirement,
    count(*) AS actual,
    'at least 2' AS expected,
    count(*) >= 2 AS passed
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'vehicle_diary'
  AND p.prokind = 'f'
  AND p.prorettype <> 'pg_catalog.trigger'::regtype;

SELECT
    'views' AS requirement,
    count(*) AS actual,
    'at least 2' AS expected,
    count(*) >= 2 AS passed
FROM information_schema.views
WHERE table_schema = 'vehicle_diary';

SELECT
    'triggers' AS requirement,
    count(*) AS actual,
    'at least 2' AS expected,
    count(*) >= 2 AS passed
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'vehicle_diary'
  AND NOT t.tgisinternal;

SELECT
    'json exports equal exported user vehicles' AS requirement,
    (SELECT count(*) FROM vehicle_json_exports) AS actual,
    (SELECT count(*) FROM vehicles WHERE user_id = '11111111-1111-4111-8111-111111111111')::text AS expected,
    (SELECT count(*) FROM vehicle_json_exports) = (
        SELECT count(*)
        FROM vehicles
        WHERE user_id = '11111111-1111-4111-8111-111111111111'
    ) AS passed;

SELECT
    'json exports belong to demo user' AS requirement,
    count(*) AS actual,
    '0' AS expected,
    count(*) = 0 AS passed
FROM vehicle_json_exports vje
JOIN vehicles v ON v.id = vje.vehicle_id
WHERE v.user_id <> '11111111-1111-4111-8111-111111111111';

SELECT
    'identifier columns use uuid' AS requirement,
    count(*) AS actual,
    '0 non-uuid id columns' AS expected,
    count(*) = 0 AS passed
FROM information_schema.columns
WHERE table_schema = 'vehicle_diary'
  AND column_name IN (
      'id',
      'user_id',
      'vehicle_id',
      'category_id',
      'part_id',
      'service_record_id',
      'issue_id',
      'source_id',
      'record_id',
      'related_service_record_id'
  )
  AND data_type <> 'uuid';

SELECT 'users' AS table_name, count(*) AS rows FROM users
UNION ALL SELECT 'vehicles', count(*) FROM vehicles
UNION ALL SELECT 'mileage_readings', count(*) FROM mileage_readings
UNION ALL SELECT 'fuel_logs', count(*) FROM fuel_logs
UNION ALL SELECT 'service_records', count(*) FROM service_records
UNION ALL SELECT 'parts', count(*) FROM parts
UNION ALL SELECT 'part_identifiers', count(*) FROM part_identifiers
UNION ALL SELECT 'service_parts', count(*) FROM service_parts
UNION ALL SELECT 'issues', count(*) FROM issues
UNION ALL SELECT 'expense_categories', count(*) FROM expense_categories
UNION ALL SELECT 'expenses', count(*) FROM expenses
UNION ALL SELECT 'reminders', count(*) FROM reminders
UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs
UNION ALL SELECT 'vehicle_json_exports', count(*) FROM vehicle_json_exports
ORDER BY table_name;
