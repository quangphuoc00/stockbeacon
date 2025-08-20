-- First, drop all existing policies for watchlists table
DROP POLICY IF EXISTS watchlists_select_own ON public.watchlists;
DROP POLICY IF EXISTS watchlists_insert_own ON public.watchlists;
DROP POLICY IF EXISTS watchlists_update_own ON public.watchlists;
DROP POLICY IF EXISTS watchlists_delete_own ON public.watchlists;

-- Ensure RLS is enabled
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- Recreate policies with correct permissions
-- Users can see their own watchlist items
CREATE POLICY watchlists_select_own ON public.watchlists
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can insert into their own watchlist
CREATE POLICY watchlists_insert_own ON public.watchlists
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlist items
CREATE POLICY watchlists_update_own ON public.watchlists
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own watchlist items
CREATE POLICY watchlists_delete_own ON public.watchlists
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'watchlists';
