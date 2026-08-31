-- Retention purge must not destroy route history that has not been compacted yet. Raw waypoints past
-- the company's retention are deleted only when their shift already has a RouteArchive (the archive
-- is what the portal serves), or after a 14-day grace period if compaction never happened (open
-- shifts, or a compaction backlog) so nothing lives forever either.
CREATE OR REPLACE FUNCTION public.purge_retention() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n_wp bigint; n_arch bigint; n_sess bigint; n_reset bigint;
BEGIN
  WITH d AS (
    DELETE FROM "LocationWaypoint" w USING "User" u, "Company" c
    WHERE u.id = w.user_id AND c.id = u.company_id
      AND (
        (w.recorded_at < (now() - make_interval(days => c.route_retention_days)) AT TIME ZONE 'UTC'
         AND EXISTS (SELECT 1 FROM "RouteArchive" ra WHERE ra.attendance_id = w.attendance_id))
        OR w.recorded_at < (now() - make_interval(days => c.route_retention_days + 14)) AT TIME ZONE 'UTC'
      )
    RETURNING 1
  ) SELECT count(*) INTO n_wp FROM d;
  WITH d AS (
    DELETE FROM "RouteArchive" r USING "Company" c
    WHERE c.id = r.company_id AND r.work_date < (now() - make_interval(days => c.route_retention_days))::date
    RETURNING 1
  ) SELECT count(*) INTO n_arch FROM d;
  WITH d AS (DELETE FROM "Session" WHERE expires_at < now() AT TIME ZONE 'UTC' RETURNING 1) SELECT count(*) INTO n_sess FROM d;
  WITH d AS (DELETE FROM "PasswordReset" WHERE expires_at < (now() - interval '1 day') AT TIME ZONE 'UTC' RETURNING 1) SELECT count(*) INTO n_reset FROM d;
  RETURN jsonb_build_object('waypoints', n_wp, 'archives', n_arch, 'sessions', n_sess, 'password_resets', n_reset, 'ran_at', now());
END $$;
