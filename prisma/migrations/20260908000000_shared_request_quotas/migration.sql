-- Opaque, expiring request counters; no identities or business payloads.
CREATE TABLE public.request_quota (
  key_hash text NOT NULL,
  kind text NOT NULL,
  resets_at timestamptz NOT NULL,
  attempts integer NOT NULL,
  PRIMARY KEY (key_hash, kind)
);
CREATE INDEX request_quota_expiry ON public.request_quota (resets_at);
ALTER TABLE public.request_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_quota FORCE ROW LEVEL SECURITY;
-- Access is restricted to the function owner by SQL privileges. This global
-- pre-authentication substrate deliberately has no tenant scope.
CREATE POLICY quota_owner ON public.request_quota USING (true) WITH CHECK (true);
REVOKE ALL ON public.request_quota FROM PUBLIC;

CREATE FUNCTION verity.consume_request_quota(p_key text, p_kind text)
RETURNS TABLE (allowed boolean, retry_after integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  quota_limit integer;
  duration_seconds integer;
  quota_count integer;
  quota_reset timestamptz;
BEGIN
  IF p_key !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid quota key'; END IF;
  quota_limit := CASE p_kind WHEN 'signin' THEN 10 WHEN 'chat' THEN 10
                  WHEN 'command' THEN 60 WHEN 'query' THEN 240 ELSE NULL END;
  IF quota_limit IS NULL THEN RAISE EXCEPTION 'Invalid quota kind'; END IF;
  duration_seconds := CASE WHEN p_kind = 'signin' THEN 300 ELSE 60 END;
  DELETE FROM public.request_quota WHERE resets_at < statement_timestamp() - interval '1 hour';
  INSERT INTO public.request_quota AS q (key_hash, kind, resets_at, attempts)
    VALUES (p_key, p_kind, statement_timestamp() + make_interval(secs => duration_seconds), 1)
    ON CONFLICT (key_hash, kind) DO UPDATE SET
      attempts = CASE WHEN q.resets_at <= statement_timestamp() THEN 1 ELSE LEAST(q.attempts + 1, quota_limit + 1) END,
      resets_at = CASE WHEN q.resets_at <= statement_timestamp()
        THEN statement_timestamp() + make_interval(secs => duration_seconds) ELSE q.resets_at END
    RETURNING attempts, resets_at INTO quota_count, quota_reset;
  RETURN QUERY SELECT quota_count <= quota_limit,
    GREATEST(1, ceil(extract(epoch FROM quota_reset - statement_timestamp()))::integer);
END;
$$;
REVOKE ALL ON FUNCTION verity.consume_request_quota(text, text) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'verity_app') THEN
    REVOKE ALL ON public.request_quota FROM verity_app;
    GRANT EXECUTE ON FUNCTION verity.consume_request_quota(text, text) TO verity_app;
  END IF;
END $$;
