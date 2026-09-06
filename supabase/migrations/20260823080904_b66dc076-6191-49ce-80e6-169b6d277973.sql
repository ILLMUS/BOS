ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_email_status text,
  ADD COLUMN IF NOT EXISTS invite_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;