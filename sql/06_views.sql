-- Views

CREATE OR REPLACE VIEW vehicle_summary_view AS
SELECT
    v.id AS vehicle_id,
    u.first_name || ' ' || u.last_name AS owner_name,
    v.brand,
    v.model,
    v.generation,
    v.production_year,
    v.engine,
    ft.code AS fuel_type,
    v.current_mileage,
    v.currency_code,
    (SELECT count(*) FROM mileage_readings mr WHERE mr.vehicle_id = v.id) AS mileage_reading_count,
    (SELECT max(mr.reading_date) FROM mileage_readings mr WHERE mr.vehicle_id = v.id) AS last_mileage_reading_date,
    (SELECT count(*) FROM fuel_logs fl WHERE fl.vehicle_id = v.id) AS fuel_log_count,
    (SELECT count(*) FROM charging_sessions cs WHERE cs.vehicle_id = v.id) AS charging_session_count,
    (SELECT count(*) FROM service_records sr WHERE sr.vehicle_id = v.id) AS service_record_count,
    (
        SELECT count(*)
        FROM issues i
        JOIN issue_statuses s ON s.id = i.status_id
        WHERE i.vehicle_id = v.id
          AND NOT s.is_terminal
    ) AS active_issue_count,
    calculate_total_vehicle_cost(v.id) AS total_cost,
    calculate_average_fuel_consumption(v.id) AS average_fuel_consumption_l_per_100km,
    calculate_average_energy_consumption(v.id) AS average_energy_consumption_kwh_per_100km
FROM vehicles v
JOIN users u ON u.id = v.user_id
JOIN fuel_types ft ON ft.id = v.fuel_type_id;

CREATE OR REPLACE VIEW vehicle_mileage_history_view AS
SELECT
    mr.id AS mileage_reading_id,
    mr.vehicle_id,
    v.brand,
    v.model,
    u.first_name || ' ' || u.last_name AS owner_name,
    mr.reading_date,
    mr.mileage,
    mr.source_type,
    mr.source_id,
    mr.note
FROM mileage_readings mr
JOIN vehicles v ON v.id = mr.vehicle_id
JOIN users u ON u.id = v.user_id;

CREATE OR REPLACE VIEW active_issues_view AS
SELECT
    i.id AS issue_id,
    v.id AS vehicle_id,
    v.brand,
    v.model,
    u.first_name || ' ' || u.last_name AS owner_name,
    i.title,
    pr.code AS priority,
    pr.weight AS priority_weight,
    s.code AS status,
    i.reported_date
FROM issues i
JOIN vehicles v ON v.id = i.vehicle_id
JOIN users u ON u.id = v.user_id
JOIN issue_statuses s ON s.id = i.status_id
JOIN issue_priorities pr ON pr.id = i.priority_id
WHERE NOT s.is_terminal;

CREATE OR REPLACE VIEW monthly_vehicle_costs_view AS
SELECT
    v.id AS vehicle_id,
    v.brand,
    v.model,
    v.currency_code,
    to_char(date_trunc('month', e.expense_date), 'YYYY-MM') AS month,
    sum(e.amount) AS total_amount,
    count(*) AS expense_count
FROM expenses e
JOIN vehicles v ON v.id = e.vehicle_id
GROUP BY
    v.id,
    v.brand,
    v.model,
    v.currency_code,
    date_trunc('month', e.expense_date);
