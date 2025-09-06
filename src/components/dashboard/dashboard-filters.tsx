'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'

interface DashboardFiltersProps {
  filters: {
    sector: string
    minScore: number
    sortBy: 'score' | 'discount' | 'marketCap'
  }
  onFiltersChange: (filters: DashboardFiltersProps['filters']) => void
  sectors: string[]
}

export function DashboardFilters({ filters, onFiltersChange, sectors }: DashboardFiltersProps) {
  const handleSectorChange = (value: string) => {
    onFiltersChange({ ...filters, sector: value })
  }
  
  const handleMinScoreChange = (value: number[]) => {
    onFiltersChange({ ...filters, minScore: value[0] })
  }
  
  const handleSortChange = (value: 'score' | 'discount' | 'marketCap') => {
    onFiltersChange({ ...filters, sortBy: value })
  }
  
  const scorePercentage = Math.round((filters.minScore / 60) * 100)
  
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Filters</CardTitle>
        <CardDescription>
          Refine your search for quality stocks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sector Filter */}
          <div className="space-y-2">
            <Label htmlFor="sector">Sector</Label>
            <Select value={filters.sector} onValueChange={handleSectorChange}>
              <SelectTrigger id="sector">
                <SelectValue placeholder="All sectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {sectors.map(sector => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Sort By */}
          <div className="space-y-2">
            <Label htmlFor="sort">Sort By</Label>
            <Select value={filters.sortBy} onValueChange={handleSortChange}>
              <SelectTrigger id="sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Overall Score</SelectItem>
                <SelectItem value="discount">Discount (Most Undervalued)</SelectItem>
                <SelectItem value="marketCap">Market Cap (Largest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Minimum Business Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="minScore">Minimum Business Score</Label>
              <Badge variant="secondary" className="text-xs">
                {filters.minScore}/60 ({scorePercentage}%)
              </Badge>
            </div>
            <Slider
              id="minScore"
              min={30}
              max={60}
              step={3}
              value={[filters.minScore]}
              onValueChange={handleMinScoreChange}
              className="mt-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50%</span>
              <span>70%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
        
        {/* Info */}
        <div className="text-sm text-muted-foreground pt-2 border-t">
          <p>
            Business Score measures company quality based on financial health, competitive moat, and growth.
            A score of {filters.minScore}/60 ({scorePercentage}%) filters for 
            {scorePercentage >= 80 ? ' exceptional' : scorePercentage >= 70 ? ' high-quality' : ' decent'} businesses.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
