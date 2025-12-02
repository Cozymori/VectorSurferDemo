/**
 * Errors Page - Error analysis, trends, and semantic search
 */

'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  TrendingUp, 
  PieChart,
  Filter,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector';
import { SurferChart, type FillMode } from '@/components/dashboard/SurferChart';
import { useErrors, useErrorSummary, useErrorTrends, useErrorSearch, useErrorDistribution } from '@/lib/hooks/useApi';
import { timeAgo, formatNumber, cn } from '@/lib/utils';

// ============ Error Distribution Chart ============
interface ErrorDistributionProps {
  data: { name: string; count: number; percentage: number }[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

function ErrorDistributionChart({ data }: ErrorDistributionProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No error data
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-3">
      {/* Bar visualization */}
      <div className="h-4 rounded-full overflow-hidden flex bg-muted">
        {data.map((item, index) => (
          <div
            key={item.name}
            className="h-full transition-all"
            style={{
              width: `${item.percentage}%`,
              backgroundColor: COLORS[index % COLORS.length],
            }}
            title={`${item.name}: ${item.count} (${item.percentage.toFixed(1)}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="truncate text-muted-foreground">{item.name}</span>
            <span className="ml-auto font-medium">{formatNumber(item.count)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Error Trend Chart ============
interface ErrorTrendChartProps {
  timeRange: number;
  fillMode: FillMode;
}

function ErrorTrendChart({ timeRange, fillMode }: ErrorTrendChartProps) {
  const bucketSize = Math.max(60, Math.floor(timeRange / 24));
  const { data: trends, isLoading } = useErrorTrends(timeRange, bucketSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const chartData = (trends || []).map((t) => ({
    name: new Date(t.timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    value: t.count,
  }));

  return (
    <SurferChart
      data={chartData}
      dataKey="value"
      fillMode={fillMode}
      strokeColor="#ef4444"
      fillColor="#ef4444"
      height={200}
      showGrid={true}
      showXAxis={true}
      showYAxis={true}
    />
  );
}

// ============ Summary Cards ============
interface SummaryCardsProps {
  timeRange: number;
}

function SummaryCards({ timeRange }: SummaryCardsProps) {
  const { data: summary, isLoading } = useErrorSummary(timeRange);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  const topErrors = summary?.by_error_code?.slice(0, 3) || [];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Total Errors */}
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm text-muted-foreground mb-1">Total Errors</p>
        <p className="text-3xl font-bold text-red-500">
          {formatNumber(summary?.total_errors || 0)}
        </p>
      </div>

      {/* Top Error Codes */}
      {topErrors.map((item, index) => (
        <div key={item.error_code} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-1">{item.error_code}</p>
          <p className="text-3xl font-bold">{formatNumber(item.count)}</p>
        </div>
      ))}

      {/* Fill empty slots */}
      {Array.from({ length: Math.max(0, 3 - topErrors.length) }).map((_, i) => (
        <div key={`empty-${i}`} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-1">-</p>
          <p className="text-3xl font-bold">0</p>
        </div>
      ))}
    </div>
  );
}

// ============ Error Card ============
interface ErrorCardProps {
  error: {
    span_id: string;
    trace_id: string;
    function_name: string;
    error_code: string;
    error_message: string;
    timestamp_utc: string;
    team?: string;
  };
}

function ErrorCard({ error }: ErrorCardProps) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-card p-4 hover:border-red-500/40 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Function & Error Code */}
          <div className="flex items-center gap-2 mb-2">
            <code className="text-sm font-semibold">{error.function_name}</code>
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
              {error.error_code}
            </span>
            {error.team && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {error.team}
              </span>
            )}
          </div>

          {/* Error Message */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {error.error_message}
          </p>

          {/* Timestamp */}
          <p className="text-xs text-muted-foreground">
            {timeAgo(error.timestamp_utc)}
          </p>
        </div>

        {/* Actions */}
        <a
          href={`/traces/${error.trace_id}`}
          className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
        >
          View Trace
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// ============ Main Page Component ============
export default function ErrorsPage() {
  const [timeRange, setTimeRange] = useState(1440);
  const [searchQuery, setSearchQuery] = useState('');
  const [functionFilter, setFunctionFilter] = useState('');
  const [errorCodeFilter, setErrorCodeFilter] = useState('');
  const [fillMode, setFillMode] = useState<FillMode>('gradient');

  const { data: errors, isLoading: loadingErrors } = useErrors(50, { 
    time_range: timeRange,
    function_name: functionFilter || undefined,
    error_code: errorCodeFilter || undefined,
  });
  const { data: searchResults, isLoading: searching } = useErrorSearch(searchQuery, 20);
  const { data: distribution } = useErrorDistribution(timeRange);

  const displayErrors = searchQuery ? searchResults?.items : errors?.items;
  const isLoading = searchQuery ? searching : loadingErrors;

  // Get unique error codes for filter
  const errorCodes = [...new Set((errors?.items || []).map(e => e.error_code).filter(Boolean))];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Errors</h1>
          <p className="text-muted-foreground">
            Analyze error patterns and search by message
          </p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Summary Cards */}
      <SummaryCards timeRange={timeRange} />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Error Trend</h3>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {(['stroke-only', 'gradient', 'solid'] as FillMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFillMode(mode)}
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded transition-colors',
                    fillMode === mode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {mode === 'stroke-only' ? 'Line' : mode === 'gradient' ? 'Gradient' : 'Solid'}
                </button>
              ))}
            </div>
          </div>
          <ErrorTrendChart timeRange={timeRange} fillMode={fillMode} />
        </div>

        {/* Distribution */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Error Distribution</h3>
          </div>
          <ErrorDistributionChart data={distribution || []} />
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Semantic Search */}
        <div className="relative flex-1 min-w-[250px] max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search errors by message (semantic search)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Function Filter */}
        <input
          type="text"
          placeholder="Function..."
          value={functionFilter}
          onChange={(e) => setFunctionFilter(e.target.value)}
          className="w-36 rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
        />

        {/* Error Code Filter */}
        <select
          value={errorCodeFilter}
          onChange={(e) => setErrorCodeFilter(e.target.value)}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">All Error Codes</option>
          {errorCodes.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>

        {/* Clear Filters */}
        {(searchQuery || functionFilter || errorCodeFilter) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFunctionFilter('');
              setErrorCodeFilter('');
            }}
            className="flex items-center gap-1 rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}

        {/* Results count */}
        <span className="text-sm text-muted-foreground ml-auto">
          {displayErrors?.length || 0} errors
        </span>
      </div>

      {/* Error List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !displayErrors || displayErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
            <p>No errors found</p>
            {(searchQuery || functionFilter || errorCodeFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFunctionFilter('');
                  setErrorCodeFilter('');
                }}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          displayErrors.map((error) => (
            <ErrorCard key={error.span_id} error={error} />
          ))
        )}
      </div>
    </div>
  );
}
