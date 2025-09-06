import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainNav } from '@/components/navigation/main-nav'
import { UserNav } from '@/components/navigation/user-nav'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { StockSearch } from '@/components/navigation/stock-search'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <MainNav />
          <div className="flex items-center gap-4">
            <StockSearch />
            <UserNav user={user} profile={profile} />
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNav user={user} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
