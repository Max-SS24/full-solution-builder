ALTER TABLE public.a11y_audit_runs ADD COLUMN acknowledged_at timestamptz, ADD COLUMN acknowledged_by uuid;
CREATE OR REPLACE FUNCTION public.acknowledge_a11y_run(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.a11y_audit_runs SET acknowledged_at = now(), acknowledged_by = auth.uid()
  WHERE id = _id AND ok = false AND acknowledged_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.acknowledge_a11y_run(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_a11y_run(uuid) TO authenticated;