ALTER TABLE public.care_options
  ADD COLUMN homepage_check jsonb,
  ADD COLUMN homepage_checked_at timestamptz;
COMMENT ON COLUMN public.care_options.homepage_check IS 'Separate community homepage outcome (url, status, checkedAt, redirectedTo); never determines care availability.';
COMMENT ON COLUMN public.care_options.homepage_checked_at IS 'Last attempted scheduled community homepage check, including unconfirmed attempts.';
CREATE INDEX care_options_homepage_check_due_idx ON public.care_options (homepage_checked_at) WHERE va_vs_community = 'community' AND status IN ('active', 'needs_review');