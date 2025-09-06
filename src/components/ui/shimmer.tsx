import { cn } from '@/lib/utils'

interface ShimmerProps {
  className?: string
}

export function Shimmer({ className }: ShimmerProps) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:200%_100%] rounded",
        className
      )}
    />
  )
}

// Pre-built shimmer components for common patterns
export function TextShimmer({ className }: ShimmerProps) {
  return <Shimmer className={cn("h-4 rounded", className)} />
}

export function TitleShimmer({ className }: ShimmerProps) {
  return <Shimmer className={cn("h-6 w-32 rounded", className)} />
}

export function CardShimmer({ className }: ShimmerProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <Shimmer className="h-32 w-full rounded-lg" />
    </div>
  )
}

// Watchlist item shimmer
export function WatchlistItemShimmer() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <Shimmer className="h-6 w-16" />
            <Shimmer className="h-6 w-20 rounded-full" />
            <Shimmer className="h-6 w-16 rounded-full" />
          </div>
          <Shimmer className="h-4 w-48" />
          <Shimmer className="h-3 w-64" />
        </div>
        <div className="text-right space-y-2">
          <Shimmer className="h-8 w-24 ml-auto" />
          <Shimmer className="h-4 w-32 ml-auto" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Shimmer className="h-16 rounded-lg" />
        <Shimmer className="h-16 rounded-lg" />
      </div>
      
      <Shimmer className="h-24 rounded-lg" />
      
      <div className="flex items-center justify-between">
        <Shimmer className="h-3 w-32" />
        <div className="flex gap-2">
          <Shimmer className="h-8 w-24 rounded" />
          <Shimmer className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  )
}

// Portfolio position shimmer
export function PortfolioPositionShimmer() {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        <div className="space-y-2">
          <Shimmer className="h-5 w-16" />
          <Shimmer className="h-4 w-32" />
        </div>
      </div>
      <div className="text-right space-y-2">
        <Shimmer className="h-5 w-20" />
        <Shimmer className="h-4 w-24" />
      </div>
      <div className="text-right space-y-2">
        <Shimmer className="h-5 w-24" />
        <Shimmer className="h-4 w-16" />
      </div>
      <div className="flex gap-2">
        <Shimmer className="h-8 w-8 rounded" />
        <Shimmer className="h-8 w-8 rounded" />
      </div>
    </div>
  )
}

// Stock card shimmer (for screener/dashboard)
export function StockCardShimmer() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shimmer className="h-5 w-16" />
            <Shimmer className="h-5 w-20 rounded-full" />
          </div>
          <Shimmer className="h-4 w-32" />
        </div>
        <Shimmer className="h-8 w-8 rounded" />
      </div>
      
      <div className="flex items-baseline gap-2">
        <Shimmer className="h-6 w-20" />
        <Shimmer className="h-4 w-16" />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <Shimmer className="h-12 rounded" />
        <Shimmer className="h-12 rounded" />
      </div>
    </div>
  )
}

// Company profile shimmer
export function CompanyProfileShimmer() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-5 w-32" />
        </div>
        <div className="space-y-2">
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-5 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-20 w-full rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Moat analysis shimmer
export function MoatAnalysisShimmer() {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-muted space-y-2">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-8 w-32" />
      </div>
      
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Shimmer className="h-5 w-5 rounded-full" />
              <Shimmer className="h-5 w-32" />
            </div>
            <Shimmer className="h-16 w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// News item shimmer
export function NewsItemShimmer() {
  return (
    <div className="border-b pb-4 space-y-2">
      <div className="flex items-start justify-between">
        <Shimmer className="h-5 w-3/4" />
        <Shimmer className="h-4 w-16 rounded-full" />
      </div>
      <Shimmer className="h-4 w-full" />
      <Shimmer className="h-4 w-2/3" />
      <div className="flex items-center gap-4">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-3 w-24" />
      </div>
    </div>
  )
}

// Valuation chart shimmer
export function ValuationChartShimmer() {
  return (
    <div className="space-y-4">
      <div className="h-64 rounded-lg overflow-hidden relative">
        <Shimmer className="h-full w-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-lg">
            <Shimmer className="h-6 w-32 mb-2" />
            <Shimmer className="h-4 w-24" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Empty state card that resembles the stock card shimmer
export function EmptyStockCard() {
  return (
    <div className="border rounded-lg p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/50 border-dashed">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 w-16 bg-gray-200/50 dark:bg-gray-800/50 rounded" />
          <div className="h-4 w-32 bg-gray-200/50 dark:bg-gray-800/50 rounded" />
        </div>
        <div className="h-8 w-8 bg-gray-200/50 dark:bg-gray-800/50 rounded" />
      </div>
      
      <div className="flex items-baseline gap-2">
        <div className="h-6 w-20 bg-gray-200/50 dark:bg-gray-800/50 rounded" />
        <div className="h-4 w-16 bg-gray-200/50 dark:bg-gray-800/50 rounded" />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="h-12 bg-gray-200/50 dark:bg-gray-800/50 rounded" />
        <div className="h-12 bg-gray-200/50 dark:bg-gray-800/50 rounded" />
      </div>
    </div>
  )
}
