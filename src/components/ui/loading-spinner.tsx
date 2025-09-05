import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/30 via-primary/20 to-transparent animate-spin" />
        
        {/* Inner ring */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-bl from-primary/20 via-transparent to-primary/20 animate-spin-reverse" />
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg 
            className={cn('text-primary animate-pulse-subtle', iconSizeClasses[size])}
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2} 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M3 13.5L9 7.5L13 11.5L21 3.5M21 3.5H15M21 3.5V9.5" 
            />
          </svg>
        </div>
      </div>
      
      {text && (
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  )
}

// Inline loading spinner for buttons and small areas
export function InlineLoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div className="relative w-4 h-4">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-current via-current/50 to-transparent animate-spin opacity-50" />
        <div className="absolute inset-0.5 rounded-full bg-gradient-to-bl from-current/30 via-transparent to-current/30 animate-spin-reverse" />
      </div>
    </div>
  )
}
