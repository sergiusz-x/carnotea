-- Seed data

INSERT INTO users (id, first_name, last_name, email) VALUES
    ('11111111-1111-4111-8111-111111111111', 'John', 'Driver', 'john.driver@example.com'),
    ('22222222-2222-4222-8222-222222222222', 'Anna', 'Road', 'anna.road@example.com'),
    ('33333333-3333-4333-8333-333333333333', 'Michael', 'Garage', 'michael.garage@example.com');

INSERT INTO vehicles (
    id,
    user_id,
    brand,
    model,
    generation,
    production_year,
    engine,
    fuel_type,
    vin,
    registration_number,
    current_mileage
) VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Mazda', '6', 'GG', 2006, '2.0', 'petrol', 'JM1GG12F761234567', 'GD62501', 245520),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '22222222-2222-4222-8222-222222222222', 'Toyota', 'Corolla', 'E210', 2020, '1.8 Hybrid', 'hybrid', 'JTDBR32E520123456', 'KR20200', 51200),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '33333333-3333-4333-8333-333333333333', 'BMW', '3 Series', 'E46', 2004, '2.0 Diesel', 'diesel', 'WBAAL710X0AE12345', 'PO30404', 218500);

INSERT INTO expense_categories (id, name, description) VALUES
    ('f1000000-0000-4000-8000-000000000001', 'Fuel', 'Fuel purchases and charging costs.'),
    ('f1000000-0000-4000-8000-000000000002', 'Service', 'Workshop labor and maintenance records.'),
    ('f1000000-0000-4000-8000-000000000003', 'Parts', 'Standalone car parts.'),
    ('f1000000-0000-4000-8000-000000000004', 'Insurance', 'Vehicle insurance costs.'),
    ('f1000000-0000-4000-8000-000000000005', 'Inspection', 'Technical inspection costs.'),
    ('f1000000-0000-4000-8000-000000000006', 'Other', 'Other vehicle costs.');

INSERT INTO parts (id, name, manufacturer, part_number, default_price) VALUES
    ('a1000000-0000-4000-8000-000000000001', 'Oxygen sensor', 'Bosch', '0258006028', 250.00),
    ('a1000000-0000-4000-8000-000000000002', 'Oil filter', 'Mann', 'W712/52', 35.00),
    ('a1000000-0000-4000-8000-000000000003', 'Engine oil 5W-40', 'Castrol', 'EDGE-5W40-4L', 180.00),
    ('a1000000-0000-4000-8000-000000000004', 'Spark plug', 'NGK', 'BKR6E', 30.00),
    ('a1000000-0000-4000-8000-000000000005', 'Front brake disc', 'ATE', '24.0125-0158.1', 210.00),
    ('a1000000-0000-4000-8000-000000000006', 'Front brake pads', 'ATE', '13.0460-7117.2', 180.00);

INSERT INTO part_identifiers (
    id,
    part_id,
    identifier_type,
    source_name,
    identifier_value
) VALUES
    ('01976000-0020-7000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'manufacturer_number', 'Bosch', '0258006028'),
    ('01976000-0020-7000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'oe_number', 'Mazda', 'LFH1-18-861'),
    ('01976000-0020-7000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'ean', 'Bosch', '4047023034634'),
    ('01976000-0020-7000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'tecdoc_article_id', 'TecDoc', 'BOS-0258006028'),
    ('01976000-0020-7000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002', 'manufacturer_number', 'Mann', 'W712/52'),
    ('01976000-0020-7000-8000-000000000006', 'a1000000-0000-4000-8000-000000000002', 'oe_number', 'Mazda', 'LF10-14-302'),
    ('01976000-0020-7000-8000-000000000007', 'a1000000-0000-4000-8000-000000000002', 'ean', 'Mann', '4011558732908'),
    ('01976000-0020-7000-8000-000000000008', 'a1000000-0000-4000-8000-000000000002', 'tecdoc_article_id', 'TecDoc', 'MAN-W71252'),
    ('01976000-0020-7000-8000-000000000009', 'a1000000-0000-4000-8000-000000000003', 'manufacturer_number', 'Castrol', 'EDGE-5W40-4L'),
    ('01976000-0020-7000-8000-000000000010', 'a1000000-0000-4000-8000-000000000003', 'ean', 'Castrol', '4008177073712'),
    ('01976000-0020-7000-8000-000000000011', 'a1000000-0000-4000-8000-000000000003', 'allegro_product_id', 'Allegro', 'AL-CASTROL-EDGE-5W40'),
    ('01976000-0020-7000-8000-000000000012', 'a1000000-0000-4000-8000-000000000004', 'manufacturer_number', 'NGK', 'BKR6E'),
    ('01976000-0020-7000-8000-000000000013', 'a1000000-0000-4000-8000-000000000004', 'oe_number', 'Mazda', 'BP01-18-110'),
    ('01976000-0020-7000-8000-000000000014', 'a1000000-0000-4000-8000-000000000004', 'tecdoc_article_id', 'TecDoc', 'NGK-BKR6E'),
    ('01976000-0020-7000-8000-000000000015', 'a1000000-0000-4000-8000-000000000005', 'manufacturer_number', 'ATE', '24.0125-0158.1'),
    ('01976000-0020-7000-8000-000000000016', 'a1000000-0000-4000-8000-000000000005', 'oe_number', 'BMW', '34116767059'),
    ('01976000-0020-7000-8000-000000000017', 'a1000000-0000-4000-8000-000000000005', 'tecdoc_article_id', 'TecDoc', 'ATE-24012501581'),
    ('01976000-0020-7000-8000-000000000018', 'a1000000-0000-4000-8000-000000000006', 'manufacturer_number', 'ATE', '13.0460-7117.2'),
    ('01976000-0020-7000-8000-000000000019', 'a1000000-0000-4000-8000-000000000006', 'oe_number', 'BMW', '34116761244'),
    ('01976000-0020-7000-8000-000000000020', 'a1000000-0000-4000-8000-000000000006', 'tecdoc_article_id', 'TecDoc', 'ATE-13046071172');

INSERT INTO fuel_logs (
    id,
    vehicle_id,
    fuel_date,
    mileage,
    liters,
    price_per_liter,
    total_cost,
    station_name,
    is_full_tank
) VALUES
    ('01976000-0001-7000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-05-01', 245000, 42.50, 6.70, 284.75, 'Shell Center', true),
    ('01976000-0001-7000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-05-18', 245520, 38.20, 6.65, 254.03, 'Orlen North', true),
    ('01976000-0001-7000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', DATE '2026-05-03', 50600, 34.00, 6.60, 224.40, 'BP City', true),
    ('01976000-0001-7000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', DATE '2026-05-25', 51200, 33.50, 6.58, 220.43, 'Circle K', true),
    ('01976000-0001-7000-8000-000000000005', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', DATE '2026-05-04', 218000, 50.00, 6.70, 335.00, 'Moya West', true),
    ('01976000-0001-7000-8000-000000000006', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', DATE '2026-05-26', 218500, 47.00, 6.68, 313.96, 'Shell South', true);

INSERT INTO service_records (
    id,
    vehicle_id,
    service_date,
    mileage,
    title,
    description,
    labor_cost,
    total_cost,
    workshop_name
) VALUES
    ('01976000-0010-7000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-04-20', 244800, 'Oil change', 'Engine oil and oil filter replacement.', 120.00, 360.00, 'Auto Service Plus'),
    ('01976000-0010-7000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-05-12', 245300, 'Oxygen sensor replacement', 'Replaced faulty oxygen sensor after high fuel consumption diagnosis.', 180.00, 430.00, 'Auto Service Plus'),
    ('01976000-0010-7000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', DATE '2026-04-28', 50500, 'Annual hybrid inspection', 'Regular inspection of hybrid system and brakes.', 300.00, 650.00, 'Toyota City Service'),
    ('01976000-0010-7000-8000-000000000004', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', DATE '2026-05-10', 218200, 'Front brake replacement', 'Front discs and pads replacement.', 250.00, 950.00, 'BMW Garage');

INSERT INTO mileage_readings (
    vehicle_id,
    reading_date,
    mileage,
    source_type,
    source_id,
    note
) VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-04-01', 244500, 'manual', NULL, 'Initial manual odometer reading.'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', DATE '2026-04-01', 50400, 'manual', NULL, 'Initial manual odometer reading.'),
    ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', DATE '2026-04-01', 217700, 'manual', NULL, 'Initial manual odometer reading.');

INSERT INTO service_parts (id, service_record_id, part_id, quantity, unit_price, total_price) VALUES
    ('01976000-0030-7000-8000-000000000001', '01976000-0010-7000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 1.00, 35.00, 35.00),
    ('01976000-0030-7000-8000-000000000002', '01976000-0010-7000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 1.00, 180.00, 180.00),
    ('01976000-0030-7000-8000-000000000003', '01976000-0010-7000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 1.00, 250.00, 250.00),
    ('01976000-0030-7000-8000-000000000004', '01976000-0010-7000-8000-000000000004', 'a1000000-0000-4000-8000-000000000005', 2.00, 210.00, 420.00),
    ('01976000-0030-7000-8000-000000000005', '01976000-0010-7000-8000-000000000004', 'a1000000-0000-4000-8000-000000000006', 1.00, 180.00, 180.00);

INSERT INTO issues (
    id,
    vehicle_id,
    reported_date,
    resolved_date,
    title,
    description,
    status,
    priority,
    related_service_record_id
) VALUES
    ('01976000-0040-7000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-05-01', DATE '2026-05-12', 'High fuel consumption', 'Fuel consumption increased in city traffic.', 'resolved', 'medium', '01976000-0010-7000-8000-000000000002'),
    ('01976000-0040-7000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', DATE '2026-05-22', NULL, 'Unstable idle RPM', 'Engine RPM fluctuates when the car is warm.', 'open', 'high', NULL),
    ('01976000-0040-7000-8000-000000000003', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', DATE '2026-05-27', NULL, 'Knocking noise from front suspension', 'Noise is visible on uneven roads.', 'open', 'medium', NULL),
    ('01976000-0040-7000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', DATE '2026-05-29', NULL, 'Hybrid battery check needed', 'Dashboard suggested a hybrid system check.', 'in_progress', 'low', NULL);

INSERT INTO expenses (
    id,
    vehicle_id,
    category_id,
    expense_date,
    amount,
    description,
    source_type,
    source_id
) VALUES
    ('01976000-0050-7000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-01', 284.75, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000001'),
    ('01976000-0050-7000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-18', 254.03, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000002'),
    ('01976000-0050-7000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-03', 224.40, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000003'),
    ('01976000-0050-7000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-25', 220.43, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000004'),
    ('01976000-0050-7000-8000-000000000005', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-04', 335.00, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000005'),
    ('01976000-0050-7000-8000-000000000006', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'f1000000-0000-4000-8000-000000000001', DATE '2026-05-26', 313.96, 'Fuel purchase', 'fuel_log', '01976000-0001-7000-8000-000000000006'),
    ('01976000-0050-7000-8000-000000000007', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'f1000000-0000-4000-8000-000000000002', DATE '2026-04-20', 360.00, 'Oil change', 'service_record', '01976000-0010-7000-8000-000000000001'),
    ('01976000-0050-7000-8000-000000000008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'f1000000-0000-4000-8000-000000000002', DATE '2026-05-12', 430.00, 'Oxygen sensor replacement', 'service_record', '01976000-0010-7000-8000-000000000002'),
    ('01976000-0050-7000-8000-000000000009', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'f1000000-0000-4000-8000-000000000002', DATE '2026-04-28', 650.00, 'Annual hybrid inspection', 'service_record', '01976000-0010-7000-8000-000000000003'),
    ('01976000-0050-7000-8000-000000000010', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'f1000000-0000-4000-8000-000000000002', DATE '2026-05-10', 950.00, 'Front brake replacement', 'service_record', '01976000-0010-7000-8000-000000000004'),
    ('01976000-0050-7000-8000-000000000011', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'f1000000-0000-4000-8000-000000000004', DATE '2026-05-30', 1200.00, 'Annual insurance policy', 'manual', NULL),
    ('01976000-0050-7000-8000-000000000012', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'f1000000-0000-4000-8000-000000000005', DATE '2026-05-30', 99.00, 'Technical inspection', 'manual', NULL);

INSERT INTO reminders (
    id,
    vehicle_id,
    title,
    description,
    due_date,
    due_mileage,
    status
) VALUES
    ('01976000-0060-7000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Next oil change', 'Change engine oil after 10000 km or one year.', DATE '2027-04-20', 254800, 'pending'),
    ('01976000-0060-7000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Insurance renewal', 'Renew annual insurance policy.', DATE '2027-05-30', NULL, 'pending'),
    ('01976000-0060-7000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'Technical inspection', 'Book regular technical inspection.', DATE '2027-04-28', NULL, 'pending'),
    ('01976000-0060-7000-8000-000000000004', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Brake check', 'Check front brakes after replacement.', NULL, 225000, 'pending');
