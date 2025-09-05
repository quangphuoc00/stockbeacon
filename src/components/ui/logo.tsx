import { cn } from '@/lib/utils'
import Link from 'next/link'

interface LogoProps {
  className?: string
  iconSize?: 'sm' | 'md' | 'lg'
  showText?: boolean
  href?: string
}

export function Logo({ 
  className, 
  iconSize = 'md', 
  showText = true,
  href = '/dashboard' 
}: LogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  const LogoContent = () => (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Custom Beacon Icon */}
      <div className="relative">
        <svg 
          className={cn(iconSizes[iconSize], 'text-blue-600')}
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Beacon Star Shape */}
          <path 
            d="M24 2L28.2 16.8L43 21L28.2 25.2L24 40L19.8 25.2L5 21L19.8 16.8L24 2Z" 
            fill="url(#beacon-gradient)"
            stroke="url(#beacon-gradient-stroke)"
            strokeWidth="1.5"
          />
          
          {/* Center glow */}
          <circle 
            cx="24" 
            cy="21" 
            r="4" 
            fill="white" 
            opacity="0.9"
          />
          
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="beacon-gradient" x1="24" y1="2" x2="24" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="0.5" stopColor="#2563EB" />
              <stop offset="1" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="beacon-gradient-stroke" x1="5" y1="21" x2="43" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60A5FA" />
              <stop offset="0.5" stopColor="#3B82F6" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Animated pulse effect */}
        <div className="absolute inset-0 animate-ping">
          <svg 
            className={cn(iconSizes[iconSize], 'text-blue-400 opacity-20')}
            viewBox="0 0 48 48" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M24 2L28.2 16.8L43 21L28.2 25.2L24 40L19.8 25.2L5 21L19.8 16.8L24 2Z" 
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
      
      {/* Logo Text */}
      {showText && (
        <div className={cn('font-bold tracking-tight', textSizes[iconSize])}>
          <span className="text-gray-900 dark:text-white">Stock</span>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Beacon</span>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        <LogoContent />
      </Link>
    )
  }

  return <LogoContent />
}

// Simplified icon-only version for favicons or small spaces
export function LogoIcon({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg 
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M24 2L28.2 16.8L43 21L28.2 25.2L24 40L19.8 25.2L5 21L19.8 16.8L24 2Z" 
        fill="url(#logo-gradient)"
      />
      <circle cx="24" cy="21" r="4" fill="white" opacity="0.9" />
      <defs>
        <linearGradient id="logo-gradient" x1="24" y1="2" x2="24" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="0.5" stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
    </svg>
  )
}
