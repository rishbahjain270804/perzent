-- Prisma stores DateTime columns as `timestamp(3) without time zone` holding UTC. The direct-access
-- functions must convert explicitly (AT TIME ZONE 'UTC') so JSON output carries a timezone and
-- comparisons with now() are correct regardless of the session TimeZone.

CREATE OR REPLACE FUNCTION public.ingest_waypoints(p_points jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid       text := public.app_user_id();
  v_now       timestamptz := now();
  v_att_id    text; v_att_status text; v_punch_in timestamptz;
  v_last_lat  float8; v_last_lng float8; v_last_at timestamptz;
  v_pt        jsonb;
  v_lat float8; v_lng float8; v_acc float8; v_spd float8; v_hdg float8; v_at timestamptz;
  v_kept int := 0; v_dropped int := 0;
  v_items jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT id, status, punch_in_time AT TIME ZONE 'UTC' INTO v_att_id, v_att_status, v_punch_in
  FROM "AttendanceRecord"
  WHERE user_id = v_uid AND status IN ('CHECKED_IN', 'ON_BREAK')
  ORDER BY punch_in_time DESC LIMIT 1;
  IF v_att_id IS NULL THEN
    RETURN jsonb_build_object('code', 'NO_ACTIVE_SHIFT', 'ingested', 0, 'dropped', 0, 'server_time', v_now);
  END IF;

  v_items := CASE WHEN jsonb_typeof(p_points) = 'array' THEN p_points
                  WHEN jsonb_typeof(p_points -> 'waypoints') = 'array' THEN p_points -> 'waypoints'
                  ELSE '[]'::jsonb END;
  IF jsonb_array_length(v_items) > 500 THEN
    RAISE EXCEPTION 'batch too large (max 500)' USING ERRCODE = '22023';
  END IF;

  SELECT latitude, longitude, recorded_at AT TIME ZONE 'UTC' INTO v_last_lat, v_last_lng, v_last_at
  FROM "LocationWaypoint" WHERE attendance_id = v_att_id ORDER BY recorded_at DESC LIMIT 1;

  FOR v_pt IN
    SELECT e.value FROM jsonb_array_elements(v_items) AS e(value)
    ORDER BY COALESCE(e.value ->> 'recorded_at', '')
  LOOP
    BEGIN
      v_lat := (v_pt ->> 'latitude')::float8;
      v_lng := (v_pt ->> 'longitude')::float8;
      v_acc := COALESCE((v_pt ->> 'accuracy')::float8, 50);
      v_spd := GREATEST(0, COALESCE((v_pt ->> 'speed')::float8, 0));
      v_hdg := COALESCE((v_pt ->> 'heading')::float8, 0);
      v_at  := COALESCE((v_pt ->> 'recorded_at')::timestamptz, v_now);
    EXCEPTION WHEN OTHERS THEN
      v_dropped := v_dropped + 1; CONTINUE;
    END;

    IF v_lat IS NULL OR v_lng IS NULL OR v_lat < -90 OR v_lat > 90 OR v_lng < -180 OR v_lng > 180
       OR v_acc < 0 OR v_acc > 150 OR v_spd > 150
       OR v_at < v_now - interval '7 days' OR v_at > v_now + interval '5 minutes'
       OR v_at < v_punch_in - interval '1 minute' THEN
      v_dropped := v_dropped + 1; CONTINUE;
    END IF;
    v_hdg := ((v_hdg::numeric % 360) + 360) % 360;

    IF v_last_at IS NOT NULL THEN
      IF date_trunc('second', v_at) = date_trunc('second', v_last_at)
         OR (public.haversine_m(v_last_lat, v_last_lng, v_lat, v_lng) < 10
             AND v_at - v_last_at < interval '10 minutes') THEN
        v_dropped := v_dropped + 1; CONTINUE;
      END IF;
    END IF;

    INSERT INTO "LocationWaypoint"(id, attendance_id, user_id, latitude, longitude, speed, heading, accuracy, recorded_at)
    VALUES (gen_random_uuid()::text, v_att_id, v_uid, v_lat, v_lng, v_spd, v_hdg, v_acc, v_at AT TIME ZONE 'UTC');
    v_kept := v_kept + 1;
    v_last_lat := v_lat; v_last_lng := v_lng; v_last_at := v_at;
  END LOOP;

  UPDATE "UserDevice" SET last_seen_at = v_now AT TIME ZONE 'UTC' WHERE user_id = v_uid AND is_active;

  RETURN jsonb_build_object(
    'ingested', v_kept, 'dropped', v_dropped,
    'attendance_id', v_att_id, 'shift_status', v_att_status, 'server_time', v_now
  );
END $$;

CREATE OR REPLACE FUNCTION public.device_heartbeat(p_telemetry jsonb DEFAULT '{}'::jsonb, p_device jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.app_user_id();
  v_now timestamptz := now();
  v_allowed text[] := ARRAY['battery_level','battery_status','battery_power_save','developer_options_enabled',
                           'location_services_enabled','location_permission_granted',
                           'background_location_permission_granted','mock_location_detected','app_version'];
  v_clean jsonb := '{}'::jsonb;
  v_key text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  FOREACH v_key IN ARRAY v_allowed LOOP
    IF p_telemetry ? v_key THEN v_clean := v_clean || jsonb_build_object(v_key, p_telemetry -> v_key); END IF;
  END LOOP;
  v_clean := v_clean || jsonb_build_object('updated_at', to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));

  UPDATE "UserDevice"
  SET telemetry = v_clean,
      last_seen_at = v_now AT TIME ZONE 'UTC',
      device_model = COALESCE(NULLIF(left(p_device ->> 'device_model', 160), ''), device_model),
      os_version   = COALESCE(NULLIF(left(p_device ->> 'os_version', 80), ''), os_version)
  WHERE user_id = v_uid AND is_active;

  IF (p_telemetry ->> 'mock_location_detected')::boolean IS TRUE
     AND NOT EXISTS (SELECT 1 FROM "TamperLog" WHERE user_id = v_uid AND event_type = 'MOCK_LOCATION_DETECTED'
                     AND occurred_at > (v_now - interval '30 minutes') AT TIME ZONE 'UTC') THEN
    INSERT INTO "TamperLog"(id, user_id, attendance_id, event_type, details)
    VALUES (gen_random_uuid()::text, v_uid,
            (SELECT id FROM "AttendanceRecord" WHERE user_id = v_uid AND status IN ('CHECKED_IN','ON_BREAK') ORDER BY punch_in_time DESC LIMIT 1),
            'MOCK_LOCATION_DETECTED', 'Mock/fake location app detected on device');
  END IF;

  RETURN jsonb_build_object('ok', true, 'server_time', v_now);
END $$;

CREATE OR REPLACE FUNCTION public.my_shift_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.app_user_id();
  v_now timestamptz := now();
  c record; a record; b_start timestamp; v_today date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  SELECT co.timezone, co.auto_checkout_time, co.max_break_minutes INTO c
  FROM "User" u JOIN "Company" co ON co.id = u.company_id WHERE u.id = v_uid;
  IF c IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;

  v_today := (v_now AT TIME ZONE c.timezone)::date;

  SELECT * INTO a FROM "AttendanceRecord"
  WHERE user_id = v_uid AND status IN ('CHECKED_IN','ON_BREAK') ORDER BY punch_in_time DESC LIMIT 1;
  IF a IS NULL THEN
    SELECT * INTO a FROM "AttendanceRecord" WHERE user_id = v_uid AND work_date = v_today;
  END IF;
  IF a IS NOT NULL THEN
    SELECT start_time INTO b_start FROM "AttendanceBreak" WHERE attendance_id = a.id AND end_time IS NULL ORDER BY start_time DESC LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'status', COALESCE(a.status::text, 'CHECKED_OUT'),
    'attendance_id', a.id,
    'work_date', a.work_date,
    'punch_in_time', a.punch_in_time AT TIME ZONE 'UTC',
    'punch_out_time', a.punch_out_time AT TIME ZONE 'UTC',
    'active_break_started_at', b_start AT TIME ZONE 'UTC',
    'already_completed_today', (a.id IS NOT NULL AND a.work_date = v_today AND a.status IN ('CHECKED_OUT','AUTO_CHECKED_OUT')),
    'total_break_minutes', COALESCE(a.total_break_minutes, 0),
    'net_worked_minutes', COALESCE(a.net_worked_minutes, 0),
    'server_time', v_now,
    'policy', jsonb_build_object('timezone', c.timezone, 'auto_checkout_time', c.auto_checkout_time, 'max_break_minutes', c.max_break_minutes)
  );
END $$;

DROP FUNCTION IF EXISTS public.live_team_positions();
CREATE FUNCTION public.live_team_positions()
RETURNS TABLE (
  user_id text, full_name text, shift_status text,
  latitude float8, longitude float8, heading float8, speed float8, accuracy float8,
  last_point_at timestamptz, last_seen_at timestamptz, battery_level int,
  gps_enabled boolean, mock_location boolean, punch_in_time timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.app_user_id();
  v_role text; v_company text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  SELECT u.role::text, u.company_id INTO v_role, v_company FROM "User" u WHERE u.id = v_uid AND u.status = 'ACTIVE';
  IF v_role IS NULL OR v_role NOT IN ('OWNER','MANAGER') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  RETURN QUERY
  WITH members AS (
    SELECT u.id, u.full_name
    FROM "User" u
    WHERE u.company_id = v_company AND u.status = 'ACTIVE' AND u.role IN ('EMPLOYEE','MANAGER')
      AND (v_role = 'OWNER' OR u.manager_id = v_uid)
  ),
  att AS (
    SELECT DISTINCT ON (a.user_id) a.user_id, a.id AS attendance_id, a.status, a.punch_in_time, a.punch_in_lat, a.punch_in_lng
    FROM "AttendanceRecord" a JOIN members m ON m.id = a.user_id
    WHERE a.status IN ('CHECKED_IN','ON_BREAK') OR a.punch_in_time > (now() - interval '36 hours') AT TIME ZONE 'UTC'
    ORDER BY a.user_id, a.punch_in_time DESC
  ),
  wp AS (
    SELECT DISTINCT ON (w.attendance_id) w.attendance_id, w.latitude, w.longitude, w.heading, w.speed, w.accuracy, w.recorded_at
    FROM "LocationWaypoint" w JOIN att ON att.attendance_id = w.attendance_id
    ORDER BY w.attendance_id, w.recorded_at DESC
  ),
  dev AS (
    SELECT DISTINCT ON (d.user_id) d.user_id, d.last_seen_at, d.telemetry
    FROM "UserDevice" d JOIN members m ON m.id = d.user_id WHERE d.is_active
    ORDER BY d.user_id, d.last_seen_at DESC
  )
  SELECT m.id, m.full_name,
         CASE WHEN att.status IS NULL THEN 'OFF_DUTY' WHEN att.status = 'AUTO_CHECKED_OUT' THEN 'CHECKED_OUT' ELSE att.status::text END,
         COALESCE(wp.latitude, att.punch_in_lat), COALESCE(wp.longitude, att.punch_in_lng),
         COALESCE(wp.heading, 0), COALESCE(wp.speed, 0), COALESCE(wp.accuracy, 25),
         COALESCE(wp.recorded_at, att.punch_in_time) AT TIME ZONE 'UTC',
         dev.last_seen_at AT TIME ZONE 'UTC',
         NULLIF(dev.telemetry ->> 'battery_level', '')::int,
         COALESCE((dev.telemetry ->> 'location_services_enabled')::boolean, true),
         COALESCE((dev.telemetry ->> 'mock_location_detected')::boolean, false),
         att.punch_in_time AT TIME ZONE 'UTC'
  FROM members m
  LEFT JOIN att ON att.user_id = m.id
  LEFT JOIN wp ON wp.attendance_id = att.attendance_id
  LEFT JOIN dev ON dev.user_id = m.id
  ORDER BY m.full_name;
END $$;
REVOKE ALL ON FUNCTION public.live_team_positions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.live_team_positions() TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_policies() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; v_deadline timestamptz; v_now timestamptz := now(); v_punch_in timestamptz;
  v_break record; v_break_start timestamptz; v_break_min int; v_gross int; v_break_total int; v_end timestamptz;
  v_lat float8; v_lng float8;
  n_checkout int := 0; n_breaks int := 0;
BEGIN
  FOR r IN
    SELECT a.id, a.user_id, a.status, a.work_date, a.punch_in_time, a.total_break_minutes, a.punch_in_lat, a.punch_in_lng, a.override_reason,
           c.timezone, c.auto_checkout_time, c.max_break_minutes
    FROM "AttendanceRecord" a JOIN "User" u ON u.id = a.user_id JOIN "Company" c ON c.id = u.company_id
    WHERE a.status IN ('CHECKED_IN','ON_BREAK')
  LOOP
    v_punch_in := r.punch_in_time AT TIME ZONE 'UTC';
    BEGIN
      v_deadline := ((r.work_date::text || ' ' || r.auto_checkout_time)::timestamp) AT TIME ZONE r.timezone;
    EXCEPTION WHEN OTHERS THEN
      v_deadline := ((r.work_date::text || ' 23:40')::timestamp) AT TIME ZONE 'Asia/Kolkata';
    END;
    IF v_deadline <= v_punch_in THEN v_deadline := v_deadline + interval '1 day'; END IF;

    SELECT * INTO v_break FROM "AttendanceBreak" WHERE attendance_id = r.id AND end_time IS NULL ORDER BY start_time DESC LIMIT 1;
    IF v_break IS NOT NULL THEN v_break_start := v_break.start_time AT TIME ZONE 'UTC'; END IF;

    IF v_now >= v_deadline THEN
      v_break_total := r.total_break_minutes;
      IF v_break IS NOT NULL THEN
        v_end := GREATEST(v_break_start, v_deadline);
        v_break_min := GREATEST(0, round(extract(epoch FROM (v_end - v_break_start)) / 60))::int;
        UPDATE "AttendanceBreak" SET end_time = v_end AT TIME ZONE 'UTC', duration_minutes = v_break_min, ended_by = 'AUTO_TIMEOUT_30MIN' WHERE id = v_break.id;
        v_break_total := v_break_total + v_break_min;
      END IF;
      SELECT latitude, longitude INTO v_lat, v_lng FROM "LocationWaypoint" WHERE attendance_id = r.id ORDER BY recorded_at DESC LIMIT 1;
      v_gross := GREATEST(0, round(extract(epoch FROM (v_deadline - v_punch_in)) / 60))::int;
      UPDATE "AttendanceRecord" SET
        status = 'AUTO_CHECKED_OUT', punch_out_time = v_deadline AT TIME ZONE 'UTC', punch_out_by = 'AUTO_SYSTEM',
        override_reason = COALESCE(r.override_reason, 'Auto checked out at ' || r.auto_checkout_time || ' (' || r.timezone || ')'),
        punch_out_lat = COALESCE(v_lat, r.punch_in_lat), punch_out_lng = COALESCE(v_lng, r.punch_in_lng),
        gross_worked_minutes = v_gross, total_break_minutes = v_break_total,
        net_worked_minutes = GREATEST(0, v_gross - v_break_total), updated_at = v_now AT TIME ZONE 'UTC'
      WHERE id = r.id;
      n_checkout := n_checkout + 1;
    ELSIF r.status = 'ON_BREAK' AND v_break IS NOT NULL
          AND v_now - v_break_start >= make_interval(mins => r.max_break_minutes) THEN
      UPDATE "AttendanceBreak" SET end_time = (v_break_start + make_interval(mins => r.max_break_minutes)) AT TIME ZONE 'UTC',
        duration_minutes = r.max_break_minutes, ended_by = 'AUTO_TIMEOUT_30MIN' WHERE id = v_break.id;
      UPDATE "AttendanceRecord" SET status = 'CHECKED_IN', total_break_minutes = total_break_minutes + r.max_break_minutes, updated_at = v_now AT TIME ZONE 'UTC' WHERE id = r.id;
      n_breaks := n_breaks + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('auto_checked_out', n_checkout, 'breaks_ended', n_breaks, 'ran_at', v_now);
END $$;

CREATE OR REPLACE FUNCTION public.purge_retention() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n_wp bigint; n_arch bigint; n_sess bigint;
BEGIN
  WITH d AS (
    DELETE FROM "LocationWaypoint" w USING "User" u, "Company" c
    WHERE u.id = w.user_id AND c.id = u.company_id
      AND w.recorded_at < (now() - make_interval(days => c.route_retention_days)) AT TIME ZONE 'UTC'
    RETURNING 1
  ) SELECT count(*) INTO n_wp FROM d;
  WITH d AS (
    DELETE FROM "RouteArchive" r USING "Company" c
    WHERE c.id = r.company_id AND r.work_date < (now() - make_interval(days => c.route_retention_days))::date
    RETURNING 1
  ) SELECT count(*) INTO n_arch FROM d;
  WITH d AS (DELETE FROM "Session" WHERE expires_at < now() AT TIME ZONE 'UTC' RETURNING 1) SELECT count(*) INTO n_sess FROM d;
  RETURN jsonb_build_object('waypoints', n_wp, 'archives', n_arch, 'sessions', n_sess, 'ran_at', now());
END $$;
