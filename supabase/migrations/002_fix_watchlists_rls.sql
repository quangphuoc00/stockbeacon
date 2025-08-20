-- Add missing RLS policies for watchlists table

-- Enable RLS on watchlists table (if not already enabled)
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- Users can only see their own watchlist items
CREATE POLICY watchlists_select_own ON public.watchlists
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert into their own watchlist
CREATE POLICY watchlists_insert_own ON public.watchlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlist items
CREATE POLICY watchlists_update_own ON public.watchlists
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own watchlist items
CREATE POLICY watchlists_delete_own ON public.watchlists
    FOR DELETE USING (auth.uid() = user_id);
