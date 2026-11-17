CREATE TABLE public.manual_validation_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 check_id uuid NOT NULL REFERENCES public.community_check_history(id),
 actor_id uuid NOT NULL,
 actor_email text,
 action text NOT NULL CHECK (action IN ('validated','reversed')),
 note text NOT NULL DEFAULT '' CHECK (length(note) <= 300),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.manual_validation_history TO authenticated;
GRANT SELECT ON public.manual_validation_history TO service_role;
ALTER TABLE public.manual_validation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read manual validation history" ON public.manual_validation_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX manual_validation_history_check_time ON public.manual_validation_history(check_id, created_at DESC, id);
INSERT INTO public.manual_validation_history(check_id, actor_id, actor_email, action, note, created_at)
SELECT h.id, h.manual_validated_by, u.email, 'validated', left(coalesce(h.manual_note,''),300), h.manual_validated_at
FROM public.community_check_history h LEFT JOIN auth.users u ON u.id = h.manual_validated_by
WHERE h.manual_validated_at IS NOT NULL AND h.manual_validated_by IS NOT NULL;
CREATE FUNCTION public.set_manual_validation(_check_id uuid, _validated boolean, _note text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE existing public.community_check_history; actor uuid := auth.uid(); event_time timestamptz := clock_timestamp();
BEGIN
 IF actor IS NULL OR NOT public.has_role(actor, 'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
 IF _validated IS NULL OR length(coalesce(_note,'')) > 300 THEN RAISE EXCEPTION 'Invalid validation input'; END IF;
 SELECT * INTO existing FROM public.community_check_history WHERE id = _check_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Check not found'; END IF;
 IF _validated = (existing.manual_validated_at IS NOT NULL) THEN RAISE EXCEPTION 'Validation state already changed; refresh and try again'; END IF;
 IF _validated AND existing.homepage_status NOT IN ('unavailable','unexpected_redirect','unconfirmed') AND existing.care_status = 'listed' THEN RAISE EXCEPTION 'Only failed checks can be manually validated'; END IF;
 UPDATE public.community_check_history SET
 manual_validated_at = CASE WHEN _validated THEN event_time ELSE NULL END,
 manual_validated_by = CASE WHEN _validated THEN actor ELSE NULL END,
 manual_note = CASE WHEN _validated THEN nullif(btrim(coalesce(_note,'')),'') ELSE NULL END
 WHERE id = _check_id;
 INSERT INTO public.manual_validation_history(check_id, actor_id, actor_email, action, note, created_at)
 VALUES (_check_id, actor, auth.jwt()->>'email', CASE WHEN _validated THEN 'validated' ELSE 'reversed' END, btrim(coalesce(_note,'')), event_time);
END;
$$;
REVOKE ALL ON FUNCTION public.set_manual_validation(uuid,boolean,text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.set_manual_validation(uuid,boolean,text) TO authenticated;