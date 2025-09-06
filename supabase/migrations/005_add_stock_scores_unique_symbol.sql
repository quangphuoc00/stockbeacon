-- Add unique constraint on symbol for stock_scores table
-- This allows upsert operations to work properly

-- First, remove any duplicate symbols (keep the most recent)
DELETE FROM public.stock_scores a
WHERE a.ctid <> (
  SELECT ctid 
  FROM public.stock_scores b 
  WHERE b.symbol = a.symbol 
  ORDER BY b.created_at DESC 
  LIMIT 1
);

-- Add unique constraint on symbol
ALTER TABLE public.stock_scores
ADD CONSTRAINT stock_scores_symbol_unique UNIQUE (symbol);

-- Add comment
COMMENT ON CONSTRAINT stock_scores_symbol_unique ON public.stock_scores 
IS 'Ensures only one score record per symbol, allowing upsert operations';
