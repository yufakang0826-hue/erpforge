/**
 * KPI Card Template — Dashboard Widget
 *
 * Features:
 * - Animated number counter (count-up on mount)
 * - Trend arrow (up/down) with color coding
 * - Optional sparkline mini-chart
 * - Loading skeleton state
 *
 * Usage:
 *   <KpiCard
 *     title="Total Orders"
 *     value={1234}
 *     previousValue={1100}
 *     format="number"
 *     icon={<ShoppingCart className="size-4" />}
 *   />
 */
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percentage';
  currency?: string;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
  sparklineData?: number[];
  className?: string;
}

// ─── Number Formatter ─────────────────────────────────────

function formatValue(
  value: number,
  format: 'number' | 'currency' | 'percentage',
  currency?: string,
): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency ?? 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      // Use integer format for whole numbers
      if (Number.isInteger(value)) {
        return new Intl.NumberFormat('en-US').format(value);
      }
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
  }
}

// ─── Animated Counter Hook ────────────────────────────────

function useAnimatedCounter(target: number, duration: number = 800): number {
  const [current, setCurrent] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = null;

    function step(timestamp: number) {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(step);
      } else {
        setCurrent(target);
      }
    }

    rafId.current = requestAnimationFrame(step);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, duration]);

  return current;
}

// ─── Trend Indicator ──────────────────────────────────────

function TrendIndicator({
  current,
  previous,
}: {
  current: number;
  previous?: number;
}) {
  if (previous === undefined || previous === 0) return null;

  const changePercent = ((current - previous) / previous) * 100;
  const isUp = changePercent > 0;
  const isFlat = Math.abs(changePercent) < 0.5;

  if (isFlat) {
    return (
      <span className="flex items-center text-xs text-muted-foreground">
        <Minus className="mr-0.5 size-3" />
        0%
      </span>
    );
  }

  return (
    <span
      className={cn(
        'flex items-center text-xs font-medium',
        isUp ? 'text-emerald-600' : 'text-red-600',
      )}
    >
      {isUp ? (
        <TrendingUp className="mr-0.5 size-3" />
      ) : (
        <TrendingDown className="mr-0.5 size-3" />
      )}
      {isUp ? '+' : ''}{changePercent.toFixed(1)}%
    </span>
  );
}

// ─── Mini Sparkline ───────────────────────────────────────

function Sparkline({
  data,
  width = 80,
  height = 24,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const isUp = data[data.length - 1] >= data[0];

  return (
    <svg
      width={width}
      height={height}
      className={cn('opacity-60', isUp ? 'text-emerald-500' : 'text-red-400')}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── KPI Card Component ───────────────────────────────────

export function KpiCard({
  title,
  value,
  previousValue,
  format = 'number',
  currency,
  prefix,
  suffix,
  icon,
  isLoading = false,
  sparklineData,
  className,
}: KpiCardProps) {
  const animatedValue = useAnimatedCounter(value);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-8 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-8 w-32" />
          <Skeleton className="mt-1 h-4 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {/* Header: title + icon */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon && (
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mt-2 flex items-end gap-3">
          <span className="text-2xl font-bold tabular-nums">
            {prefix}
            {formatValue(animatedValue, format, currency)}
            {suffix}
          </span>

          {sparklineData && <Sparkline data={sparklineData} />}
        </div>

        {/* Trend */}
        <div className="mt-1">
          <TrendIndicator current={value} previous={previousValue} />
        </div>
      </CardContent>
    </Card>
  );
}
