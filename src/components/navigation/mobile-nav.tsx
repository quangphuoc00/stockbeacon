'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Home, Search, Eye, Briefcase, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Hidden Gems', href: '/hidden-gems', icon: Search },
  { name: 'Smart Watchlist', href: '/watchlist', icon: Eye },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { name: 'Profile', href: '/profile', icon: UserIcon },
]

interface MobileNavProps {
  user: User
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t md:hidden">
      <nav className="flex items-center justify-around py-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors',
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              <Icon className={cn(
                'h-5 w-5',
                isActive && 'scale-110'
              )} />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
