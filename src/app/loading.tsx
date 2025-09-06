import { Shimmer } from '@/components/ui/shimmer'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Shimmer */}
      <div className="mb-8">
        <Shimmer className="h-10 w-64 mb-3" />
        <Shimmer className="h-5 w-96" />
      </div>

      {/* Navigation/Tab Shimmer */}
      <div className="flex gap-4 mb-6">
        <Shimmer className="h-10 w-32 rounded" />
        <Shimmer className="h-10 w-32 rounded" />
        <Shimmer className="h-10 w-32 rounded" />
      </div>

      {/* Content Grid Shimmer */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border rounded-lg p-6 space-y-3">
            <Shimmer className="h-6 w-3/4" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-2/3" />
            <div className="pt-2">
              <Shimmer className="h-8 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
