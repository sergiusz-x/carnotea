-- Seed data for lookup tables (static reference data required for the app to function)

INSERT INTO fuel_types (code, sort_order) VALUES
  ('petrol',   10),
  ('diesel',   20),
  ('hybrid',   30),
  ('electric', 40),
  ('lpg',      50),
  ('other',    99);

INSERT INTO part_identifier_types (code, sort_order) VALUES
  ('manufacturer_number', 10),
  ('oe_number',           20),
  ('ean',                 30),
  ('tecdoc_article_id',   40),
  ('allegro_product_id',  50),
  ('other',               99);

INSERT INTO issue_statuses (code, is_terminal, sort_order) VALUES
  ('open',        false, 10),
  ('in_progress', false, 20),
  ('resolved',    true,  30),
  ('cancelled',   true,  40);

INSERT INTO issue_priorities (code, weight, sort_order) VALUES
  ('low',    1, 10),
  ('medium', 2, 20),
  ('high',   3, 30);

INSERT INTO reminder_statuses (code, is_terminal, sort_order) VALUES
  ('pending',   false, 10),
  ('done',      true,  20),
  ('cancelled', true,  30);

INSERT INTO charger_types (code, max_kw, sort_order) VALUES
  ('home_socket', 2.3,   10),
  ('ac_type2',    22.0,  20),
  ('dc_ccs',      350.0, 30),
  ('dc_chademo',  100.0, 40),
  ('tesla_sc',    250.0, 50),
  ('other',       NULL,  99);

INSERT INTO expense_categories (code, name) VALUES
  ('fuel',        'Fuel'),
  ('electricity', 'Electricity'),
  ('service',     'Service'),
  ('parts',       'Parts'),
  ('insurance',   'Insurance'),
  ('inspection',  'Inspection'),
  ('other',       'Other');
