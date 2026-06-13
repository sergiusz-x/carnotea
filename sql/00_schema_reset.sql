/*
Project: Vehicle Diary

This database stores a simple vehicle maintenance diary for a future web/PWA
application. It allows users to manage vehicles, fuel logs, service records,
parts, issues, expenses, reminders, odometer mileage readings, audit logs, and
JSON exports of a vehicle history.
*/

DROP SCHEMA IF EXISTS vehicle_diary CASCADE;
CREATE SCHEMA vehicle_diary;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
SET search_path TO vehicle_diary, public;

-- PostgreSQL 16 does not provide a built-in UUIDv7 generator. This helper keeps
-- history-like tables time-sortable while still using random bits for uniqueness.
CREATE OR REPLACE FUNCTION generate_uuid_v7()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $function$
DECLARE
    v_time_ms bigint;
    v_uuid bytea;
BEGIN
    v_time_ms := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
    v_uuid := public.gen_random_bytes(16);

    v_uuid := set_byte(v_uuid, 0, ((v_time_ms >> 40) & 255)::integer);
    v_uuid := set_byte(v_uuid, 1, ((v_time_ms >> 32) & 255)::integer);
    v_uuid := set_byte(v_uuid, 2, ((v_time_ms >> 24) & 255)::integer);
    v_uuid := set_byte(v_uuid, 3, ((v_time_ms >> 16) & 255)::integer);
    v_uuid := set_byte(v_uuid, 4, ((v_time_ms >> 8) & 255)::integer);
    v_uuid := set_byte(v_uuid, 5, (v_time_ms & 255)::integer);
    v_uuid := set_byte(v_uuid, 6, (get_byte(v_uuid, 6) & 15) | 112);
    v_uuid := set_byte(v_uuid, 8, (get_byte(v_uuid, 8) & 63) | 128);

    RETURN encode(v_uuid, 'hex')::uuid;
END;
$function$;
