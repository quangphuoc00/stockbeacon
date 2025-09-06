-- Add purchase_score to portfolios table
ALTER TABLE public.portfolios 
ADD COLUMN IF NOT EXISTS purchase_score INTEGER DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_portfolios_purchase_score ON public.portfolios(purchase_score);

-- Add comment
COMMENT ON COLUMN public.portfolios.purchase_score IS 'StockBeacon score at the time of purchase';
