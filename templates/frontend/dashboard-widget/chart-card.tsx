/**
 * Chart Card Template — Dashboard Widget
 *
 * A reusable card wrapper for Recharts charts.
 *
 * Features:
 * - Configurable chart types (line, bar, area)
 * - Responsive container
 * - Loading skeleton
 * - Period selector (7d / 30d / 90d)
 *
 * Usage:
 *   <ChartCard
 *     title="Revenue Trend"
 *     data={revenueData}
 *     type="area"
 *     dataKey="revenue"
 *     xAxisKey="date"
 *   />
 */
import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  AreaChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────

interface DataSeries {
  key: string;
  name: string;
  color: string;
}

interface ChartCardProps {
  title: string;
  data: Record<string, unknown>[];
  type?: 'line' | 'bar' | 'area';
  xAxisKey: string;
  series: DataSeries[];
  height?: number;
  isLoading?: boolean;
  showPeriodSelector?: boolean;
  onPeriodChange?: (period: string) => void;
  formatXAxis?: (value: string) => string;
  formatTooltip?: (value: number) => string;
  className?: string;
}

// ─── Default Formatters ───────────────────────────────────

function defaultFormatXAxis(value: string): string {
  // Try to parse as date
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return value;
}

function defaultFormatTooltip(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}

// ─── Chart Card Component ─────────────────────────────────

export function ChartCard({
  title,
  data,
  type = 'line',
  xAxisKey,
  series,
  height = 300,
  isLoading = false,
  showPeriodSelector = false,
  onPeriodChange,
  formatXAxis = defaultFormatXAxis,
  formatTooltip = defaultFormatTooltip,
  className,
}: ChartCardProps) {
  const [period, setPeriod] = useState('30d');

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-5 w-32" />
          {showPeriodSelector && <Skeleton className="h-8 w-20" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  // Select chart component based on type
  const ChartComponent = type === 'bar' ? BarChart : type === 'area' ? AreaChart : LineChart;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>

        {showPeriodSelector && (
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7D</SelectItem>
              <SelectItem value="30d">30D</SelectItem>
              <SelectItem value="90d">90D</SelectItem>
            </SelectContent>
          </Select>
        )}
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={formatXAxis}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tickFormatter={defaultFormatTooltip}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              width={60}
            />
            <Tooltip
              formatter={(value: number) => [formatTooltip(value)]}
              labelFormatter={formatXAxis}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--background))',
              }}
            />
            {series.length > 1 && <Legend />}

            {series.map((s) => {
              if (type === 'bar') {
                return (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.name}
                    fill={s.color}
                    radius={[4, 4, 0, 0]}
                  />
                );
              }
              if (type === 'area') {
                return (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                );
              }
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              );
            })}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Preset Color Palette ─────────────────────────────────

export const CHART_COLORS = {
  blue: 'hsl(221, 83%, 53%)',
  green: 'hsl(142, 71%, 45%)',
  orange: 'hsl(25, 95%, 53%)',
  purple: 'hsl(262, 83%, 58%)',
  red: 'hsl(0, 72%, 51%)',
  teal: 'hsl(173, 80%, 40%)',
  pink: 'hsl(330, 81%, 60%)',
  yellow: 'hsl(48, 96%, 53%)',
} as const;

// ─── Usage Examples ───────────────────────────────────────

/**
 * Revenue trend (area chart):
 *
 * <ChartCard
 *   title="Revenue Trend"
 *   type="area"
 *   data={[
 *     { date: '2026-03-01', revenue: 12500, orders: 45 },
 *     { date: '2026-03-02', revenue: 15200, orders: 52 },
 *     ...
 *   ]}
 *   xAxisKey="date"
 *   series={[
 *     { key: 'revenue', name: 'Revenue', color: CHART_COLORS.blue },
 *   ]}
 *   showPeriodSelector
 *   formatTooltip={(v) => `$${v.toLocaleString()}`}
 * />
 *
 *
 * Orders by platform (bar chart):
 *
 * <ChartCard
 *   title="Orders by Platform"
 *   type="bar"
 *   data={[
 *     { platform: 'eBay', orders: 120 },
 *     { platform: 'Amazon', orders: 85 },
 *     { platform: 'Walmart', orders: 45 },
 *   ]}
 *   xAxisKey="platform"
 *   series={[
 *     { key: 'orders', name: 'Orders', color: CHART_COLORS.blue },
 *   ]}
 * />
 */
