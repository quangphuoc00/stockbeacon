-- Add performance indexes for stock_scores table
-- These indexes will significantly improve query performance for our S&P 500 dashboard

-- Index for filtering by business quality score (for quality stocks)
CREATE INDEX IF NOT EXISTS idx_stock_scores_business_quality 
ON public.stock_scores(business_quality_score DESC);

-- Composite index for symbol and created_at (for historical queries)
CREATE INDEX IF NOT EXISTS idx_stock_scores_symbol_created 
ON public.stock_scores(symbol, created_at DESC);

-- Index for updated_at to find stale scores efficiently
CREATE INDEX IF NOT EXISTS idx_stock_scores_updated 
ON public.stock_scores(updated_at DESC);

-- Index for overall score (for sorting)
CREATE INDEX IF NOT EXISTS idx_stock_scores_score 
ON public.stock_scores(score DESC);

-- Composite index for filtering quality stocks by multiple criteria
CREATE INDEX IF NOT EXISTS idx_stock_scores_quality_filter 
ON public.stock_scores(business_quality_score DESC, score DESC) 
WHERE business_quality_score >= 42; -- 70% of 60

-- Index for recommendation type
CREATE INDEX IF NOT EXISTS idx_stock_scores_recommendation 
ON public.stock_scores(recommendation);

-- Add constraint to ensure scores are within valid ranges
ALTER TABLE public.stock_scores 
ADD CONSTRAINT check_moat_score CHECK (ai_moat_score IS NULL OR (ai_moat_score >= 0 AND ai_moat_score <= 20));

-- Add comments for documentation
COMMENT ON INDEX idx_stock_scores_business_quality IS 'For filtering quality stocks by business score';
COMMENT ON INDEX idx_stock_scores_symbol_created IS 'For historical score queries by symbol';
COMMENT ON INDEX idx_stock_scores_updated IS 'For finding stale scores that need updating';
COMMENT ON INDEX idx_stock_scores_score IS 'For sorting stocks by overall score';
COMMENT ON INDEX idx_stock_scores_quality_filter IS 'Optimized for S&P 500 quality stock queries';
