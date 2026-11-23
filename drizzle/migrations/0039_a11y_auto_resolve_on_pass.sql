ALTER TABLE public.a11y_audit_runs ADD COLUMN resolved_by_run uuid REFERENCES public.a11y_audit_runs(id) ON DELETE SET NULL;

-- A passing run resolves an older failure only when it is the same kind of check and passed every page that failed.
CREATE OR REPLACE FUNCTION public.a11y_run_covers(_failure public.a11y_audit_runs, _pass public.a11y_audit_runs)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT _pass.ok AND _pass.failed = 0 AND _pass.kind = _failure.kind AND _pass.ran_at > _failure.ran_at
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(_pass.results) p WHERE COALESCE((p->>'ok')::boolean, false))
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(_failure.results) f
      WHERE NOT COALESCE((f->>'ok')::boolean, false)
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(_pass.results) p
          WHERE p->>'path' = f->>'path' AND COALESCE((p->>'ok')::boolean, false)))
$$;
REVOKE ALL ON FUNCTION public.a11y_run_covers(public.a11y_audit_runs, public.a11y_audit_runs) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.resolve_a11y_failures_on_pass()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.a11y_audit_runs o
     SET acknowledged_at = NEW.ran_at, acknowledged_by = NULL, resolved_by_run = NEW.id
   WHERE o.ok = false AND o.acknowledged_at IS NULL AND public.a11y_run_covers(o, NEW);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.resolve_a11y_failures_on_pass() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER a11y_runs_resolve_on_pass
AFTER INSERT ON public.a11y_audit_runs
FOR EACH ROW WHEN (NEW.ok) EXECUTE FUNCTION public.resolve_a11y_failures_on_pass();

-- Resolve failures that already have a later passing run.
WITH m AS (
  SELECT DISTINCT ON (o.id) o.id, p.id AS pass_id, p.ran_at
    FROM public.a11y_audit_runs o
    JOIN public.a11y_audit_runs p ON public.a11y_run_covers(o, p)
   WHERE o.ok = false AND o.acknowledged_at IS NULL
   ORDER BY o.id, p.ran_at
)
UPDATE public.a11y_audit_runs t SET acknowledged_at = m.ran_at, resolved_by_run = m.pass_id
  FROM m WHERE t.id = m.id;