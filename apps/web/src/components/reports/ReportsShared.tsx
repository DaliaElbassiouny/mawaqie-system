'use client';

import { AlertTriangle, FileBarChart2, type LucideIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn, formatCompactNumber, formatNumber } from '@/lib/utils';

type Numberish = number | null | undefined;
type ChartTooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: {
    fill?: string;
  };
};

const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#2563eb',
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card px-3 py-2 shadow-card-md">
      {label ? <p className="mb-2 text-xs font-semibold text-text-primary">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-text-secondary">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color || entry.payload?.fill || CHART_COLORS[index % CHART_COLORS.length] }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-text-primary" dir="ltr">
              {formatNumber(entry.value, { maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-surface-border bg-surface-card text-text-muted">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-surface-border bg-surface-card text-text-muted">
      <AlertTriangle className="h-8 w-8 text-red-400" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyPanel({
  title,
  description,
  icon: Icon = FileBarChart2,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-surface-border bg-surface-card px-6 text-center',
        className,
      )}
    >
      <div className="rounded-2xl bg-surface-hover p-3 text-text-muted">
        <Icon className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-surface-border bg-surface-card shadow-card', className)}>
      <div className="flex flex-col gap-3 border-b border-surface-border px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          {subtitle ? <p className="text-sm text-text-secondary">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  accent = 'brand',
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'brand' | 'blue' | 'green' | 'amber' | 'red' | 'slate';
  icon?: LucideIcon;
}) {
  const accentMap = {
    brand: 'from-blue-500/15 to-blue-500/5 text-blue-500',
    blue: 'from-blue-500/15 to-blue-500/5 text-blue-500',
    green: 'from-emerald-500/15 to-emerald-500/5 text-emerald-500',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-500',
    red: 'from-red-500/15 to-red-500/5 text-red-500',
    slate: 'from-slate-500/15 to-slate-500/5 text-slate-500',
  } as const;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', accentMap[accent].split(' ').slice(0, 2).join(' '))} />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-muted">{label}</p>
          <p className="text-2xl font-semibold text-text-primary" dir="ltr">
            {value}
          </p>
          {hint ? <p className="text-xs text-text-secondary">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={cn('rounded-xl bg-gradient-to-br p-2.5', accentMap[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MiniInsightList({
  items,
  accent = 'brand',
}: {
  items: Array<{ label: string; value: string; meta?: string }>;
  accent?: 'brand' | 'red';
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="flex items-start justify-between gap-4 rounded-xl border border-surface-border bg-surface-hover/35 px-4 py-3"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">{item.label}</p>
            {item.meta ? <p className="text-xs text-text-secondary">{item.meta}</p> : null}
          </div>
          <p
            className={cn('text-sm font-semibold', accent === 'red' ? 'text-red-500' : 'text-blue-500')}
            dir="ltr"
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ReportTable<T>({
  columns,
  rows,
  emptyText,
}: {
  columns: Array<{ key: string; label: string; render: (row: T) => React.ReactNode }>;
  rows: T[];
  emptyText: string;
}) {
  if (!rows.length) {
    return <EmptyPanel title={emptyText} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-surface-hover/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-start text-xs font-semibold text-text-secondary whitespace-nowrap"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface-card">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="align-top hover:bg-surface-hover/35">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-text-secondary">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

export function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-hover/20 px-4 py-3">
      <span className="text-sm text-text-secondary">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[hsl(var(--brand))]"
      />
    </label>
  );
}

export function DonutChartCard({
  title,
  subtitle,
  data,
  height = 260,
}: {
  title: string;
  subtitle?: string;
  data: Array<{ label: string; value: number }>;
  height?: number;
}) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      {data.length === 0 ? (
        <EmptyPanel title={title} description={subtitle} className="min-h-[200px]" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={`${entry.label}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {data.map((entry, index) => (
              <div key={entry.label} className="flex items-center justify-between gap-4 rounded-xl border border-surface-border bg-surface-hover/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm text-text-primary">{entry.label}</span>
                </div>
                <span className="text-sm font-semibold text-text-primary" dir="ltr">
                  {formatNumber(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export function BarChartCard({
  title,
  subtitle,
  data,
  series,
  height = 280,
  stacked = false,
}: {
  title: string;
  subtitle?: string;
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; label: string; color?: string }>;
  height?: number;
  stacked?: boolean;
}) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      {data.length === 0 ? (
        <EmptyPanel title={title} description={subtitle} className="min-h-[220px]" />
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="hsl(var(--surface-border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'hsl(var(--text-muted))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--text-muted))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCompactNumber(value)}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(value, entry: any) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'hsl(var(--text-secondary))' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        backgroundColor: entry.color,
                        flexShrink: 0,
                      }}
                    />
                    {value}
                  </span>
                )}
                iconSize={0}
              />
              {series.map((item, index) => (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.label}
                  fill={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
                  radius={[8, 8, 0, 0]}
                  stackId={stacked ? 'stack' : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}

export function LineChartCard({
  title,
  subtitle,
  data,
  dataKey,
  xKey = 'label',
  height = 280,
}: {
  title: string;
  subtitle?: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  xKey?: string;
  height?: number;
}) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      {data.length === 0 ? (
        <EmptyPanel title={title} description={subtitle} className="min-h-[220px]" />
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="hsl(var(--surface-border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey={xKey}
                tick={{ fill: 'hsl(var(--text-muted))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--text-muted))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCompactNumber(value)}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 3, fill: '#3b82f6' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}

export function ProgressList({
  title,
  subtitle,
  items,
  color = 'bg-blue-500',
}: {
  title: string;
  subtitle?: string;
  items: Array<{ label: string; value: Numberish; secondary?: Numberish }>;
  color?: string;
}) {
  const max = Math.max(...items.map((item) => Number(item.value ?? 0)), 1);

  return (
    <SectionCard title={title} subtitle={subtitle}>
      {items.length === 0 ? (
        <EmptyPanel title={title} description={subtitle} className="min-h-[200px]" />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const primary = Number(item.value ?? 0);
            const secondary = Number(item.secondary ?? 0);

            return (
              <div key={`${item.label}-${primary}-${secondary}`} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-text-primary">{item.label}</span>
                  <span className="text-sm font-semibold text-text-primary" dir="ltr">
                    {formatNumber(primary)}
                    {item.secondary != null ? (
                      <span className="text-text-muted"> / {formatNumber(secondary)}</span>
                    ) : null}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-hover">
                  <div
                    className={cn('h-full rounded-full', color)}
                    style={{ width: `${Math.max((primary / max) * 100, 8)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
