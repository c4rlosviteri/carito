CREATE TABLE IF NOT EXISTS public.glucose_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glucose_value INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'mg/dL',
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
