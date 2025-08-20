-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    risk_tolerance TEXT DEFAULT 'balanced' CHECK (risk_tolerance IN ('conservative', 'balanced', 'growth')),
    onboarding_completed BOOLEAN DEFAULT false
);

-- Stocks table
CREATE TABLE IF NOT EXISTS public.stocks (
    symbol TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    sector TEXT,
    industry TEXT,
    market_cap BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock scores table
CREATE TABLE IF NOT EXISTS public.stock_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL REFERENCES public.stocks(symbol) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    business_quality_score INTEGER NOT NULL CHECK (business_quality_score >= 0 AND business_quality_score <= 60),
    timing_score INTEGER NOT NULL CHECK (timing_score >= 0 AND timing_score <= 40),
    ai_moat_score INTEGER CHECK (ai_moat_score >= 0 AND ai_moat_score <= 20),
    financial_health_score INTEGER NOT NULL CHECK (financial_health_score >= 0 AND financial_health_score <= 25),
    growth_score INTEGER NOT NULL CHECK (growth_score >= 0 AND growth_score <= 15),
    valuation_score INTEGER NOT NULL CHECK (valuation_score >= 0 AND valuation_score <= 20),
    technical_score INTEGER NOT NULL CHECK (technical_score >= 0 AND technical_score <= 20),
    explanation TEXT,
    recommendation TEXT NOT NULL CHECK (recommendation IN ('strong_buy', 'buy', 'hold', 'sell', 'strong_sell')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock data table (real-time prices)
CREATE TABLE IF NOT EXISTS public.stock_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL REFERENCES public.stocks(symbol) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    price_change DECIMAL(10, 2) DEFAULT 0,
    price_change_percent DECIMAL(5, 2) DEFAULT 0,
    volume BIGINT DEFAULT 0,
    market_cap BIGINT,
    pe_ratio DECIMAL(10, 2),
    eps DECIMAL(10, 2),
    dividend_yield DECIMAL(5, 2),
    week_52_high DECIMAL(10, 2),
    week_52_low DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlists table
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL REFERENCES public.stocks(symbol) ON DELETE CASCADE,
    target_price DECIMAL(10, 2),
    alert_enabled BOOLEAN DEFAULT true,
    notes TEXT,
    buy_triggers JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL REFERENCES public.stocks(symbol) ON DELETE CASCADE,
    quantity DECIMAL(15, 4) NOT NULL CHECK (quantity > 0),
    average_price DECIMAL(10, 2) NOT NULL CHECK (average_price > 0),
    current_price DECIMAL(10, 2),
    total_value DECIMAL(15, 2),
    gain_loss DECIMAL(15, 2),
    gain_loss_percent DECIMAL(10, 2),
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL REFERENCES public.stocks(symbol) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('price_target', 'score_change', 'perfect_storm', 'news', 'earnings')),
    condition JSONB NOT NULL,
    triggered BOOLEAN DEFAULT false,
    triggered_at TIMESTAMPTZ,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Moat Analysis table
CREATE TABLE IF NOT EXISTS public.ai_moat_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL REFERENCES public.stocks(symbol) ON DELETE CASCADE,
    moat_score INTEGER NOT NULL CHECK (moat_score >= 0 AND moat_score <= 100),
    brand_loyalty_score INTEGER NOT NULL CHECK (brand_loyalty_score >= 0 AND brand_loyalty_score <= 100),
    switching_costs_score INTEGER NOT NULL CHECK (switching_costs_score >= 0 AND switching_costs_score <= 100),
    network_effects_score INTEGER NOT NULL CHECK (network_effects_score >= 0 AND network_effects_score <= 100),
    scale_advantages_score INTEGER NOT NULL CHECK (scale_advantages_score >= 0 AND scale_advantages_score <= 100),
    analysis_text TEXT NOT NULL,
    strengths JSONB,
    weaknesses JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

-- Create indexes for better performance
CREATE INDEX idx_stock_scores_symbol ON public.stock_scores(symbol);
CREATE INDEX idx_stock_scores_score ON public.stock_scores(score DESC);
CREATE INDEX idx_stock_scores_created_at ON public.stock_scores(created_at DESC);

CREATE INDEX idx_stock_data_symbol ON public.stock_data(symbol);
CREATE INDEX idx_stock_data_created_at ON public.stock_data(created_at DESC);

CREATE INDEX idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX idx_watchlists_symbol ON public.watchlists(symbol);

CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX idx_portfolios_symbol ON public.portfolios(symbol);

CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_symbol ON public.alerts(symbol);
CREATE INDEX idx_alerts_triggered ON public.alerts(triggered);

CREATE INDEX idx_ai_moat_analysis_symbol ON public.ai_moat_analysis(symbol);
CREATE INDEX idx_ai_moat_analysis_created_at ON public.ai_moat_analysis(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON public.stocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_scores_updated_at BEFORE UPDATE ON public.stock_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON public.watchlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see and update their own profile
CREATE POLICY users_select_own ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Users can only see their own watchlists
CREATE POLICY watchlists_select_own ON public.watchlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY watchlists_insert_own ON public.watchlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY watchlists_update_own ON public.watchlists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY watchlists_delete_own ON public.watchlists
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only see their own portfolios
CREATE POLICY portfolios_select_own ON public.portfolios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY portfolios_insert_own ON public.portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY portfolios_update_own ON public.portfolios
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY portfolios_delete_own ON public.portfolios
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only see their own alerts
CREATE POLICY alerts_select_own ON public.alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY alerts_insert_own ON public.alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY alerts_update_own ON public.alerts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY alerts_delete_own ON public.alerts
    FOR DELETE USING (auth.uid() = user_id);

-- Public read access for stocks and scores (everyone can see)
CREATE POLICY stocks_select_all ON public.stocks
    FOR SELECT USING (true);

CREATE POLICY stock_scores_select_all ON public.stock_scores
    FOR SELECT USING (true);

CREATE POLICY stock_data_select_all ON public.stock_data
    FOR SELECT USING (true);

CREATE POLICY ai_moat_analysis_select_all ON public.ai_moat_analysis
    FOR SELECT USING (true);

-- Insert some initial stock data for testing
INSERT INTO public.stocks (symbol, company_name, sector, industry, market_cap) VALUES
    ('AAPL', 'Apple Inc.', 'Technology', 'Consumer Electronics', 3000000000000),
    ('GOOGL', 'Alphabet Inc.', 'Technology', 'Internet Services', 2000000000000),
    ('MSFT', 'Microsoft Corporation', 'Technology', 'Software', 2800000000000),
    ('AMZN', 'Amazon.com Inc.', 'Consumer Cyclical', 'E-Commerce', 1700000000000),
    ('TSLA', 'Tesla Inc.', 'Consumer Cyclical', 'Auto Manufacturers', 800000000000),
    ('NVDA', 'NVIDIA Corporation', 'Technology', 'Semiconductors', 1100000000000),
    ('META', 'Meta Platforms Inc.', 'Technology', 'Internet Services', 900000000000),
    ('BRK.B', 'Berkshire Hathaway Inc.', 'Financial', 'Conglomerates', 800000000000),
    ('JPM', 'JPMorgan Chase & Co.', 'Financial', 'Banks', 500000000000),
    ('JNJ', 'Johnson & Johnson', 'Healthcare', 'Pharmaceuticals', 400000000000)
ON CONFLICT (symbol) DO NOTHING;
