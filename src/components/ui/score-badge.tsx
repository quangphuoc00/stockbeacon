/**
 * ScoreBadge Component
 * A highly accessible and prominent display component for StockBeacon Scores
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function ScoreBadge({ 
  score, 
  size = 'md', 
  showLabel = true,
  showTooltip = true,
  className 
}: ScoreBadgeProps) {
  // Determine score quality
  const getScoreQuality = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-green-500 text-white', emoji: '🚀' };
    if (score >= 70) return { label: 'Good', color: 'bg-green-400 text-white', emoji: '✅' };
    if (score >= 50) return { label: 'Fair', color: 'bg-yellow-500 text-white', emoji: '⚠️' };
    return { label: 'Poor', color: 'bg-red-500 text-white', emoji: '❌' };
  };

  const quality = getScoreQuality(score);

  // Size configurations
  const sizeClasses = {
    sm: 'text-sm px-2 py-1 min-w-[40px]',
    md: 'text-lg px-3 py-1.5 min-w-[55px]',
    lg: 'text-xl px-4 py-2 min-w-[65px]',
    xl: 'text-2xl px-5 py-2.5 min-w-[75px]',
  };

  const labelSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  };

  // Tooltip content
  const tooltipContent = `
    StockBeacon Score: ${score}/100
    Quality: ${quality.label} ${quality.emoji}
    
    What this means:
    ${score >= 80 ? 'This stock shows exceptional strength across fundamentals and timing.' :
      score >= 70 ? 'This stock demonstrates solid potential with good business quality.' :
      score >= 50 ? 'This stock has mixed signals - some positive, some concerning.' :
      'This stock currently shows significant weaknesses or risks.'}
    
    Score Components:
    • Business Quality (60%): Financial health, moat strength, growth
    • Timing (40%): Valuation opportunity, technical indicators
  `;

  return (
    <div 
      className={cn('flex flex-col items-center gap-0.5', className)}
      role="status"
      aria-live="polite"
    >
      {showLabel && (
        <div className="flex items-center gap-1">
          <span className={cn(
            'text-muted-foreground font-semibold uppercase tracking-wider',
            labelSizeClasses[size]
          )}>
            Score
          </span>
          {showTooltip && (
            <Info 
              className={cn(
                'text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-help',
                size === 'sm' ? 'h-3 w-3' : 
                size === 'md' ? 'h-3.5 w-3.5' :
                size === 'lg' ? 'h-4 w-4' :
                'h-5 w-5'
              )}
              title={tooltipContent}
            />
          )}
        </div>
      )}
      <div className="relative">
        <Badge 
          className={cn(
            quality.color,
            sizeClasses[size],
            'font-bold text-center shadow-sm hover:shadow-md transition-all duration-200',
            'border-2 border-white/20'
          )}
          aria-label={`StockBeacon Score: ${score} out of 100, rated as ${quality.label}`}
          title={showTooltip ? tooltipContent : undefined}
        >
          <span className="relative z-10">{score}</span>
          {size !== 'sm' && (
            <span className="absolute inset-0 opacity-10 bg-gradient-to-br from-white to-transparent rounded pointer-events-none" />
          )}
        </Badge>
        {size === 'xl' && (
          <div className={cn(
            'absolute -bottom-2 left-1/2 transform -translate-x-1/2',
            'text-[10px] font-medium px-2 py-0.5 rounded-full',
            quality.color,
            'shadow-sm'
          )}>
            {quality.label}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ScoreIndicator Component
 * A circular progress indicator for scores
 */
export function ScoreIndicator({ score, size = 60 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const quality = score >= 80 ? 'stroke-green-500' :
                  score >= 70 ? 'stroke-green-400' :
                  score >= 50 ? 'stroke-yellow-500' :
                  'stroke-red-500';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="4"
          fill="none"
          className={cn(quality, 'transition-all duration-500')}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{score}</span>
      </div>
    </div>
  );
}
