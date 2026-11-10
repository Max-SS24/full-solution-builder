ALTER TABLE public.care_options ADD COLUMN IF NOT EXISTS hours text;
COMMENT ON COLUMN public.care_options.hours IS 'Opening hours read from the official VA.gov page structured data (VA rows only).';