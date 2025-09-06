-- Create table for S&P 500 constituents
-- This allows us to track historical membership and have a database fallback

CREATE TABLE IF NOT EXISTS public.sp500_constituents (
    symbol TEXT PRIMARY KEY REFERENCES public.stocks(symbol) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    sector TEXT,
    date_added DATE,
    market_cap_tier TEXT CHECK (market_cap_tier IN ('mega', 'large', 'mid')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active constituents (most common query)
CREATE INDEX IF NOT EXISTS idx_sp500_active 
ON public.sp500_constituents(is_active) 
WHERE is_active = true;

-- Index for sector grouping
CREATE INDEX IF NOT EXISTS idx_sp500_sector 
ON public.sp500_constituents(sector);

-- Index for market cap tier
CREATE INDEX IF NOT EXISTS idx_sp500_market_cap 
ON public.sp500_constituents(market_cap_tier);

-- Enable Row Level Security
ALTER TABLE public.sp500_constituents ENABLE ROW LEVEL SECURITY;

-- Create policies for S&P 500 constituents
-- Anyone can read (public data)
CREATE POLICY "sp500_constituents_read_all" ON public.sp500_constituents
    FOR SELECT
    USING (true);

-- Only authenticated users can insert/update (for admin functions)
CREATE POLICY "sp500_constituents_write_auth" ON public.sp500_constituents
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Add updated_at trigger
CREATE TRIGGER update_sp500_constituents_updated_at
    BEFORE UPDATE ON public.sp500_constituents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.sp500_constituents IS 'Current and historical S&P 500 index constituents';
COMMENT ON COLUMN public.sp500_constituents.is_active IS 'Whether the stock is currently in the S&P 500';
COMMENT ON COLUMN public.sp500_constituents.date_added IS 'Date when the stock was added to the index';
COMMENT ON COLUMN public.sp500_constituents.market_cap_tier IS 'Market capitalization tier: mega (>200B), large (10-200B), mid (<10B)';
