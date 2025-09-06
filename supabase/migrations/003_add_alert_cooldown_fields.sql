-- Add cooldown fields to watchlists table
ALTER TABLE public.watchlists
ADD COLUMN IF NOT EXISTS last_alert_sent TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS alert_cooldown_hours INTEGER DEFAULT 24;

-- Add index for efficient alert checking
CREATE INDEX IF NOT EXISTS idx_watchlists_alert_check 
ON public.watchlists(symbol, alert_enabled, last_alert_sent)
WHERE alert_enabled = true;
