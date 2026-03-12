# Dashboard Widget Templates

Reusable dashboard components for KPI cards and charts.

## Components

### KpiCard

A metric card with animated counter, trend arrow, and optional sparkline.

```tsx
import { KpiCard } from './kpi-card';
import { ShoppingCart, DollarSign, TrendingUp, Package } from 'lucide-react';

// In your dashboard:
<div className="grid grid-cols-4 gap-4">
  <KpiCard
    title="Total Orders"
    value={1234}
    previousValue={1100}
    format="number"
    icon={<ShoppingCart className="size-4" />}
  />
  <KpiCard
    title="Revenue"
    value={45678}
    previousValue={42000}
    format="currency"
    currency="USD"
    icon={<DollarSign className="size-4" />}
    sparklineData={[100, 120, 115, 130, 145, 140, 155]}
  />
  <KpiCard
    title="Conversion Rate"
    value={3.2}
    previousValue={2.8}
    format="percentage"
    icon={<TrendingUp className="size-4" />}
  />
  <KpiCard
    title="Pending Shipments"
    value={42}
    format="number"
    icon={<Package className="size-4" />}
  />
</div>
```

### ChartCard

A card wrapper for Recharts with period selector and loading state.

```tsx
import { ChartCard, CHART_COLORS } from './chart-card';

<ChartCard
  title="Revenue Trend"
  type="area"
  data={revenueData}
  xAxisKey="date"
  series={[
    { key: 'revenue', name: 'Revenue', color: CHART_COLORS.blue },
    { key: 'cost', name: 'Cost', color: CHART_COLORS.orange },
  ]}
  showPeriodSelector
  onPeriodChange={(period) => fetchData(period)}
  formatTooltip={(v) => `$${v.toLocaleString()}`}
  height={350}
/>
```

## Props Reference

### KpiCard Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Card title |
| `value` | `number` | required | Current value |
| `previousValue` | `number` | — | Previous period value (for trend) |
| `format` | `'number' \| 'currency' \| 'percentage'` | `'number'` | Value format |
| `currency` | `string` | `'USD'` | Currency code (when format='currency') |
| `prefix` | `string` | — | Prefix before value |
| `suffix` | `string` | — | Suffix after value |
| `icon` | `ReactNode` | — | Icon in top-right corner |
| `isLoading` | `boolean` | `false` | Show loading skeleton |
| `sparklineData` | `number[]` | — | Mini sparkline data points |

### ChartCard Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Chart title |
| `data` | `Record[]` | required | Chart data |
| `type` | `'line' \| 'bar' \| 'area'` | `'line'` | Chart type |
| `xAxisKey` | `string` | required | Data key for X axis |
| `series` | `DataSeries[]` | required | Data series config |
| `height` | `number` | `300` | Chart height in px |
| `isLoading` | `boolean` | `false` | Show loading skeleton |
| `showPeriodSelector` | `boolean` | `false` | Show 7D/30D/90D selector |
| `onPeriodChange` | `(period) => void` | — | Period change callback |
| `formatXAxis` | `(value) => string` | date formatter | X axis label formatter |
| `formatTooltip` | `(value) => string` | number formatter | Tooltip value formatter |

## Design Principles

- Numbers animate on mount (count-up effect with ease-out cubic)
- Integer values never show decimals
- Trend arrows are color-coded: green for up, red for down
- Sparklines provide visual context without taking up space
- Loading skeletons match the final layout shape
