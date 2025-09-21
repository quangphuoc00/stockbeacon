'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { GraduationCap, ChevronDown, Target, Shield, Lightbulb, BarChart3 } from 'lucide-react'

export function NewsEducationGuide() {
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  
  // Debug log to verify component is rendering
  console.log('NewsEducationGuide component rendered')

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <Collapsible open={isGuideOpen} onOpenChange={setIsGuideOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5" />
                Why News Matters for Investors
              </CardTitle>
              <ChevronDown className={`h-5 w-5 transition-transform ${isGuideOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </CardHeader>
      
      <Collapsible open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4 text-sm">
              {/* Market-Moving Events */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold">Market-Moving Events</h4>
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Earnings reports</strong> - Quarterly results can cause significant price movements</li>
                  <li>• <strong>Product launches</strong> - New products/services can drive future growth</li>
                  <li>• <strong>Mergers & acquisitions</strong> - Can dramatically change a company's value</li>
                  <li>• <strong>Management changes</strong> - New leadership often signals strategic shifts</li>
                </ul>
              </div>

              {/* Risk Management */}
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <h4 className="font-semibold">Risk Management</h4>
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Early warning signs</strong> - News often reveals problems before they show in financials</li>
                  <li>• <strong>Regulatory issues</strong> - Lawsuits, investigations, or compliance problems</li>
                  <li>• <strong>Competitive threats</strong> - New competitors or market disruptions</li>
                  <li>• <strong>Economic changes</strong> - Interest rates, inflation, policy changes</li>
                </ul>
              </div>

              {/* Investment Opportunities */}
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold">Investment Opportunities</h4>
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Underreaction</strong> - Markets sometimes don't immediately price in good news</li>
                  <li>• <strong>Sector trends</strong> - Industry-wide developments can benefit multiple stocks</li>
                  <li>• <strong>Sentiment shifts</strong> - News can signal changing investor perception</li>
                  <li>• <strong>Catalyst identification</strong> - Events that could trigger price movements</li>
                </ul>
              </div>

              {/* Context for Numbers */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  <h4 className="font-semibold">Context for Numbers</h4>
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Why behind the what</strong> - Financial statements show results, news explains causes</li>
                  <li>• <strong>Future outlook</strong> - Management guidance and strategic plans</li>
                  <li>• <strong>Competitive position</strong> - How the company compares to peers</li>
                  <li>• <strong>Market conditions</strong> - Industry headwinds or tailwinds</li>
                </ul>
              </div>

              {/* How to Read News */}
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">💡 Pro Tips for Reading News</h4>
                <ul className="space-y-1 text-muted-foreground text-xs">
                  <li>• Look at sentiment badges to quickly gauge impact</li>
                  <li>• Check related tickers to understand broader implications</li>
                  <li>• Focus on long-term impact news for investment decisions</li>
                  <li>• Short-term news is better for trading opportunities</li>
                  <li>• Multiple tickers may indicate sector-wide trends</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
