-- Add 'critical' issue priority
INSERT INTO issue_priorities (code, weight, sort_order) VALUES ('critical', 4, 40)
ON CONFLICT (code) DO NOTHING;