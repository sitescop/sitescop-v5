import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface StatTileProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatTile({ label, value, change, trend = 'neutral', className, ...props }: StatTileProps) {
  const trendColor =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-text-light';

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-elevated',
        className,
      )}
      {...props}
    >
      <p className="text-sm font-medium text-text-light">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-text">{value}</p>
      {change && <p className={cn('mt-1 text-xs', trendColor)}>{change}</p>}
    </div>
  );
}
