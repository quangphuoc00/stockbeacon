'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp, Home, Search, Eye, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Screener', href: '/screener', icon: Search },
  { name: 'Watchlist', href: '/watchlist', icon: Eye },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-6">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <TrendingUp className="h-8 w-8 text-blue-600" />
        <span className="text-xl font-bold">StockBeacon</span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-600',
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-600 dark:text-gray-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
