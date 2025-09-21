-- Create FMP API keys management table
CREATE TABLE IF NOT EXISTS fmp_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    number_failures INTEGER DEFAULT 0,
    tries INTEGER DEFAULT 0,
    blacklist BOOLEAN DEFAULT false,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_fmp_keys_blacklist ON fmp_keys(blacklist);
CREATE INDEX idx_fmp_keys_tries ON fmp_keys(tries);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fmp_keys_updated_at BEFORE UPDATE
    ON fmp_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE fmp_keys ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage FMP keys
CREATE POLICY "Service role can manage FMP keys" ON fmp_keys
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comment
COMMENT ON TABLE fmp_keys IS 'Stores Financial Modeling Prep API keys with usage tracking and blacklist functionality';
