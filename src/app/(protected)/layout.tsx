import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainNav } from '@/components/navigation/main-nav'
import { UserNav } from '@/components/navigation/user-nav'
import { MobileNav } from '@/components/navigation/mobile-nav'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Temporarily bypass authentication for testing
  // TODO: Re-enable authentication after testing
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()

  // if (!user) {
  //   redirect('/login')
  // }

  // // Fetch user profile
  // const { data: profile } = await supabase
  //   .from('users')
  //   .select('*')
  //   .eq('id', user.id)
  //   .single()

  // Mock user for testing
  const user = { id: 'test-user', email: 'test@example.com' }
  const profile = null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <MainNav />
          <UserNav user={user} profile={profile} />
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
