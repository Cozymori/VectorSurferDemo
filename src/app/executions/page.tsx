/**
 * Executions Page - Execution logs with filtering and detail modal
 */

'use client';

import { useState } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  X,
  Clock,
  Zap,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector';
import { useExecutions, useSlowestExecutions, useExecution } from '@/lib/hooks/useApi';
import { formatDuration, timeAgo, cn } from '@/lib/utils';
import type { ExecutionFilters, Execution } from '@/lib/types/api';

const PAGE_SIZE = 20;

// ============ Execution Detail Modal ============
interface ExecutionDetailModalProps {
  spanId: string | null;
  onClose: () => void;
}

function ExecutionDetailModal({ spanId, onClose }: ExecutionDetailModalProps) {
  const { data: execution, isLoading } = useExecution(spanId || '');

  if (!spanId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl border border-border bg-card shadow-2xl mx-4">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-semibold">Execution Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : !execution ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Execution not found
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status & Basic Info */}
              <div className="flex items-center gap-4">
                <StatusBadge status={execution.status} />
                <span className="text-sm text-muted-foreground">
                  {timeAgo(execution.timestamp_utc)}
                </span>
              </div>

              {/* Function Info */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Function</p>
                  <code className="text-sm font-semibold">{execution.function_name}</code>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Duration</p>
                    <p className="text-sm font-medium">{formatDuration(execution.duration_ms)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Team</p>
                    <p className="text-sm font-medium">{execution.team || '-'}</p>
                  </div>
                </div>
              </div>

              {/* IDs */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Span ID</p>
                  <code className="text-xs break-all">{execution.span_id}</code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Trace ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs break-all">{execution.trace_id}</code>
                    <a
                      href={`/traces/${execution.trace_id}`}
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Error Info (if error) */}
              {execution.status === 'ERROR' && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-500">{execution.error_code}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{execution.error_message}</p>
                </div>
              )}

              {/* Input Preview */}
              {execution.input_preview && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Input</p>
                  <pre className="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-32">
                    {execution.input_preview}
                  </pre>
                </div>
              )}

              {/* Output Preview */}
              {execution.output_preview && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Output</p>
                  <pre className="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-32">
                    {execution.output_preview}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Slowest Executions Section ============
function SlowestExecutionsSection() {
  const { data: slowest, isLoading } = useSlowestExecutions(5);
  const [selectedSpan, setSelectedSpan] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  const items = slowest?.items || [];

  if (items.length === 0) return null;

  return (
    <>
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold text-orange-500">Slowest Executions</h3>
        </div>

        <div className="grid gap-2 md:grid-cols-5">
          {items.map((exec, index) => (
            <button
              key={exec.span_id}
              onClick={() => setSelectedSpan(exec.span_id)}
              className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 hover:border-orange-500/50 transition-colors"
            >
              <span className="text-lg font-bold text-orange-500">
                {formatDuration(exec.duration_ms)}
              </span>
              <code className="text-xs text-muted-foreground truncate max-w-full">
                {exec.function_name}
              </code>
            </button>
          ))}
        </div>
      </div>

      <ExecutionDetailModal 
        spanId={selectedSpan} 
        onClose={() => setSelectedSpan(null)} 
      />
    </>
  );
}

// ============ Main Page Component ============
export default function ExecutionsPage() {
  const [page, setPage] = useState(0);
  const [timeRange, setTimeRange] = useState(1440);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [selectedSpan, setSelectedSpan] = useState<string | null>(null);

  const appliedFilters: ExecutionFilters = {
    status: statusFilter || undefined,
    function_name: searchQuery || undefined,
    team: teamFilter || undefined,
    time_range: timeRange,
  };

  const { data, isLoading } = useExecutions(PAGE_SIZE, page * PAGE_SIZE, appliedFilters);

  const executions = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Reset page when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(0);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executions</h1>
          <p className="text-muted-foreground">
            Browse and filter function execution logs
          </p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Slowest Executions */}
      <SlowestExecutionsSection />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by function name..."
            value={searchQuery}
            onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Status</option>
          <option value="SUCCESS">Success</option>
          <option value="ERROR">Error</option>
          <option value="CACHE_HIT">Cache Hit</option>
        </select>

        {/* Team Filter */}
        <input
          type="text"
          placeholder="Filter by team..."
          value={teamFilter}
          onChange={(e) => handleFilterChange(setTeamFilter)(e.target.value)}
          className="w-32 rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Clear Filters */}
        {(searchQuery || statusFilter || teamFilter) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('');
              setTeamFilter('');
              setPage(0);
            }}
            className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}

        {/* Results count */}
        <span className="text-sm text-muted-foreground ml-auto">
          {total} results
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Function</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Duration</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Team</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Time</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : executions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No executions found
                </td>
              </tr>
            ) : (
              executions.map((exec) => (
                <tr key={exec.span_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedSpan(exec.span_id)}
                      className="text-left hover:text-primary transition-colors"
                    >
                      <code className="text-sm font-medium">{exec.function_name}</code>
                    </button>
                    {exec.error_message && (
                      <p className="text-xs text-red-400 mt-1 line-clamp-1">{exec.error_message}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={exec.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDuration(exec.duration_ms)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {exec.team || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {timeAgo(exec.timestamp_utc)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedSpan(exec.span_id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Details
                      </button>
                      <a
                        href={`/traces/${exec.trace_id}`}
                        className="text-xs text-muted-foreground hover:text-primary"
                      >
                        Trace
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-border p-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-border p-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <ExecutionDetailModal 
        spanId={selectedSpan} 
        onClose={() => setSelectedSpan(null)} 
      />
    </div>
  );
}
