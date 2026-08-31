-- Auto check-out deadline is anchored to the latest (re)start of the shift — punch-in or the end of
-- the most recent break/off-duty gap — so a shift resumed after the cut-off is not closed again on
-- the next run with zero credit. Mirrors apps/admin-portal/src/lib/policy.ts autoCheckoutDeadline.
CREATE OR REPLACE FUNCTION public.enforce_policies() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; v_deadline timestamptz; v_now timestamptz := now(); v_punch_in timestamptz; v_anchor timestamptz; v_last_end timestamp;
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
    SELECT max(end_time) INTO v_last_end FROM "AttendanceBreak" WHERE attendance_id = r.id;
    v_anchor := GREATEST(v_punch_in, COALESCE(v_last_end AT TIME ZONE 'UTC', v_punch_in));
    IF v_deadline <= v_anchor THEN v_deadline := v_deadline + interval '1 day'; END IF;

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
      UPDATE "AttendanceRecord" SET status = 'CHECKED_IN', total_break_minutes = total_break_minutes + r.max_break_minutes, updated_at = v_now AT TIME ZONE 'UTC'
      WHERE id = r.id;
      n_breaks := n_breaks + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('auto_checked_out', n_checkout, 'breaks_ended', n_breaks, 'ran_at', v_now);
END $$;
