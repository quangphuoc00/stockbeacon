export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center justify-center">
        {/* Same style as stock page loading */}
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-bl from-primary/10 via-transparent to-primary/10 animate-spin-reverse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg 
              className="w-12 h-12 text-primary animate-pulse-subtle" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
              />
            </svg>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="mt-6 text-center">
          <h3 className="text-lg font-semibold mb-2">StockBeacon</h3>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Analyzing markets</span>
            <span className="flex gap-1">
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce-dot" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
