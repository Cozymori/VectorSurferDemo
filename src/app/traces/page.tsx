/**
 * Traces Page - Distributed tracing list with improved cards
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  Search,
  ExternalLink,
  Clock,
  Layers,
  Filter,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTraces } from '@/lib/hooks/useApi';
import { useTranslation } from '@/lib/i18n';
import { formatDuration, timeAgo, cn } from '@/lib/utils';

export default function TracesPage() {
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();

  const { data, isLoading } = useTraces(limit);

  // Filter traces
  const traces = (data || []).filter(trace => {
    if (statusFilter && trace.status !== statusFilter) return false;
    if (searchQuery && !trace.root_function.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('traces.title')}</h1>
          <p className="text-muted-foreground">
            {t('traces.subtitle')}
          </p>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
        >
          <option value={20}>{t('traces.last20')}</option>
          <option value={50}>{t('traces.last50')}</option>
          <option value={100}>{t('traces.last100')}</option>
        </select>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('traces.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">{t('status.allStatus')}</option>
          <option value="SUCCESS">{t('status.success')}</option>
          <option value="ERROR">{t('common.error')}</option>
          <option value="PARTIAL">{t('status.partial')}</option>
        </select>

        {/* Results count */}
        <span className="text-sm text-muted-foreground ml-auto">
          {traces.length} traces
        </span>
      </div>

      {/* Traces Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-border bg-muted"
            />
          ))
        ) : traces.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
            <GitBranch className="h-12 w-12 mb-4 opacity-50" />
            <p>{t('traces.noTraces')}</p>
            {(searchQuery || statusFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                }}
                className="mt-2 text-sm text-primary hover:underline"
              >
                {t('common.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          traces.map((trace) => (
            <Link
              key={trace.trace_id}
              href={`/traces/${trace.trace_id}`}
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-lg"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch className="h-4 w-4 text-primary shrink-0" />
                  <code className="text-sm font-semibold truncate">
                    {trace.root_function}
                  </code>
                </div>
                <StatusBadge status={trace.status} size="sm" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">{t('traces.duration')}</span>
                  </div>
                  <p className="font-semibold">
                    {formatDuration(trace.total_duration_ms)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Layers className="h-3 w-3" />
                    <span className="text-xs">{t('traces.spans')}</span>
                  </div>
                  <p className="font-semibold">{trace.span_count}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {timeAgo(trace.start_time)}
                </span>
                <span className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('traces.viewDetails')} <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
