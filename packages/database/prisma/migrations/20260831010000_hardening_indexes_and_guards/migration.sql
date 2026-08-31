-- Hardening pass (2026-08-31): indexes for the hot queries, duplicate protection for waypoints,
-- inactive users locked out of the direct Supabase path, and a remote_config column so app/portal
-- tunables can be changed without a release.

-- 1. Indexes ---------------------------------------------------------------------------------
-- Open-shift lookup (every GPS batch, every duty-screen sync, my_shift_state / ingest_waypoints).
CREATE INDEX IF NOT EXISTS "AttendanceRecord_user_id_status_punch_in_time_idx"
  ON "AttendanceRecord"(user_id, status, punch_in_time);
-- Policy enforcement (status-leading) and route-archive compaction (status + punch_out_time).
CREATE INDEX IF NOT EXISTS "AttendanceRecord_status_punch_out_time_idx"
  ON "AttendanceRecord"(status, punch_out_time);
-- Sign-in looks up by phone/email without a company_id prefix.
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"(phone);
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"(email);

-- 2. One row per (shift, second): re-sent batches can never duplicate points ------------------
DELETE FROM "LocationWaypoint" a USING "LocationWaypoint" b
  WHERE a.attendance_id = b.attendance_id AND a.recorded_at = b.recorded_at AND a.id > b.id;
CREATE UNIQUE INDEX IF NOT EXISTS "LocationWaypoint_attendance_id_recorded_at_key"
  ON "LocationWaypoint"(attendance_id, recorded_at);

-- 3. Remote config ---------------------------------------------------------------------------
ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "remote_config" JSONB;

-- 4. Direct path: only ACTIVE users resolve to a user id -------------------------------------
-- Every RPC authorises through app_user_id(); a suspended employee or a reset device therefore
-- gets 'unauthorized' immediately instead of keeping access until its JWT expires.
CREATE OR REPLACE FUNCTION public.app_user_id() RETURNS text
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT u.id FROM "User" u
  WHERE u.id = NULLIF(public.app_claims() ->> 'sub', '') AND u.status = 'ACTIVE'
$$;

-- 5. ingest_waypoints: identical to 20260828040000, plus ON CONFLICT DO NOTHING ----------------
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
    VALUES (gen_random_uuid()::text, v_att_id, v_uid, v_lat, v_lng, v_spd, v_hdg, v_acc, v_at AT TIME ZONE 'UTC')
    ON CONFLICT (attendance_id, recorded_at) DO NOTHING;
    v_kept := v_kept + 1;
    v_last_lat := v_lat; v_last_lng := v_lng; v_last_at := v_at;
  END LOOP;

  UPDATE "UserDevice" SET last_seen_at = v_now AT TIME ZONE 'UTC' WHERE user_id = v_uid AND is_active;

  RETURN jsonb_build_object(
    'ingested', v_kept, 'dropped', v_dropped,
    'attendance_id', v_att_id, 'shift_status', v_att_status, 'server_time', v_now
  );
END $$;
