/**
 * Trace Detail Page - Waterfall & Tree view with AI analysis
 */

'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  GitBranch, 
  Sparkles, 
  Loader2,
  ChevronRight,
  ChevronDown,
  Clock,
  Layers,
  AlertTriangle,
  BarChart3,
  List,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTrace, useTraceTree, useTraceAnalysis } from '@/lib/hooks/useApi';
import { formatDuration, timeAgo, cn } from '@/lib/utils';
import type { Span } from '@/lib/types/api';

// ============ View Mode Types ============
type ViewMode = 'waterfall' | 'tree';

// ============ View Mode Selector ============
interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewModeSelector({ value, onChange }: ViewModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
      <button
        onClick={() => onChange('waterfall')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
          value === 'waterfall'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <BarChart3 className="h-3 w-3" />
        Waterfall
      </button>
      <button
        onClick={() => onChange('tree')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
          value === 'tree'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <List className="h-3 w-3" />
        Tree
      </button>
    </div>
  );
}

// ============ Waterfall View ============
interface WaterfallViewProps {
  spans: Span[];
  totalDuration: number;
}

function WaterfallView({ spans, totalDuration }: WaterfallViewProps) {
  // Calculate offset for each span based on start time
  const processedSpans = useMemo(() => {
    if (spans.length === 0) return [];
    
    const startTimes = spans.map(s => new Date(s.start_time).getTime());
    const minStart = Math.min(...startTimes);
    
    return spans.map(span => {
      const spanStart = new Date(span.start_time).getTime();
      const offsetMs = spanStart - minStart;
      const offsetPercent = totalDuration > 0 ? (offsetMs / totalDuration) * 100 : 0;
      const widthPercent = totalDuration > 0 ? (span.duration_ms / totalDuration) * 100 : 0;
      
      return {
        ...span,
        offsetPercent,
        widthPercent: Math.max(widthPercent, 0.5), // Minimum width for visibility
      };
    });
  }, [spans, totalDuration]);

  return (
    <div className="space-y-1">
      {processedSpans.map((span) => (
        <div key={span.span_id} className="flex items-center gap-3 py-1">
          {/* Function name with indent */}
          <div
            className="w-52 shrink-0 truncate text-sm"
            style={{ paddingLeft: `${(span.depth || 0) * 16}px` }}
          >
            <code className="text-foreground">{span.function_name}</code>
          </div>

          {/* Timeline bar */}
          <div className="flex-1 h-7 bg-muted rounded-lg relative overflow-hidden">
            <div
              className={cn(
                'absolute h-full rounded-lg transition-all flex items-center justify-end pr-2',
                span.status === 'SUCCESS' && 'bg-green-500/70',
                span.status === 'ERROR' && 'bg-red-500/70',
                span.status === 'CACHE_HIT' && 'bg-blue-500/70'
              )}
              style={{
                left: `${span.offsetPercent}%`,
                width: `${span.widthPercent}%`,
                minWidth: '4px',
              }}
            >
              {span.widthPercent > 8 && (
                <span className="text-xs text-white font-medium">
                  {formatDuration(span.duration_ms)}
                </span>
              )}
            </div>
          </div>

          {/* Duration (shown outside if bar is too small) */}
          <div className="w-16 shrink-0 text-right text-xs text-muted-foreground">
            {formatDuration(span.duration_ms)}
          </div>

          {/* Status */}
          <div className="w-20 shrink-0">
            <StatusBadge status={span.status} size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Tree Node Component ============
interface TreeNodeProps {
  span: Span & { children?: Span[] };
  depth?: number;
}

function TreeNode({ span, depth = 0 }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = span.children && span.children.length > 0;

  return (
    <div>
      {/* Node */}
      <div 
        className={cn(
          'flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors',
          depth > 0 && 'ml-6 border-l-2 border-border'
        )}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 rounded hover:bg-muted"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Status indicator */}
        <div className={cn(
          'w-2 h-2 rounded-full shrink-0',
          span.status === 'SUCCESS' && 'bg-green-500',
          span.status === 'ERROR' && 'bg-red-500',
          span.status === 'CACHE_HIT' && 'bg-blue-500'
        )} />

        {/* Function name */}
        <code className="text-sm font-medium flex-1 truncate">
          {span.function_name}
        </code>

        {/* Duration */}
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDuration(span.duration_ms)}
        </span>

        {/* Status badge */}
        <StatusBadge status={span.status} size="sm" />
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-3">
            {span.children!.map((child) => (
                <TreeNode key={child.span_id} span={child as Span & { children?: Span[] }} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

// ============ Tree View ============
interface TreeViewProps {
  traceId: string;
}

function TreeView({ traceId }: TreeViewProps) {
  const { data: treeData, isLoading } = useTraceTree(traceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tree = treeData?.tree || [];

  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tree data available
      </div>
    );
  }

  return (
    <div className="space-y-1">
        {tree.map((node: Span & { children?: Span[] }) => (
            <TreeNode key={node.span_id} span={node} />
        ))}
    </div>
  );
}

// ============ AI Analysis Section ============
interface AIAnalysisSectionProps {
  traceId: string;
  language: string;
}

function AIAnalysisSection({ traceId, language }: AIAnalysisSectionProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const { data: analysis, isLoading, refetch } = useTraceAnalysis(traceId, language);

  const handleAnalyze = () => {
    setShowAnalysis(true);
    refetch();
  };

  if (!showAnalysis) {
    return (
      <button
        onClick={handleAnalyze}
        className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/30 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/20 transition-colors w-full"
      >
        <Sparkles className="h-4 w-4" />
        AI 분석 시작하기
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">AI Analysis</h3>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          분석 중...
        </div>
      ) : (
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {analysis?.analysis || 'No analysis available'}
        </p>
      )}
    </div>
  );
}

// ============ Main Page Component ============
export default function Page() {
  const params = useParams();
  const traceId = params.id as string;
  
  const [viewMode, setViewMode] = useState<ViewMode>('waterfall');
  const [language, setLanguage] = useState<'en' | 'ko'>('ko');

  const { data: trace, isLoading } = useTrace(traceId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trace || trace.status === 'NOT_FOUND') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <GitBranch className="h-12 w-12 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Trace not found</p>
        <Link href="/traces" className="text-primary hover:underline">
          Back to traces
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/traces"
            className="rounded-xl border border-border p-2.5 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Trace Details</h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{traceId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
          
          {/* View Mode */}
          <ViewModeSelector value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <GitBranch className="h-4 w-4" />
            <span className="text-xs">Status</span>
          </div>
          <StatusBadge status={trace.status} />
        </div>
        
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Total Duration</span>
          </div>
          <p className="text-xl font-bold">{formatDuration(trace.total_duration_ms)}</p>
        </div>
        
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Layers className="h-4 w-4" />
            <span className="text-xs">Span Count</span>
          </div>
          <p className="text-xl font-bold">{trace.span_count}</p>
        </div>
        
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Start Time</span>
          </div>
          <p className="text-sm font-medium">{timeAgo(trace.start_time)}</p>
        </div>
      </div>

      {/* AI Analysis */}
      <AIAnalysisSection traceId={traceId} language={language} />

      {/* Trace View */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            {viewMode === 'waterfall' ? 'Waterfall View' : 'Tree View'}
          </h3>
          <span className="text-xs text-muted-foreground">
            {trace.span_count} spans
          </span>
        </div>
        
        {viewMode === 'waterfall' ? (
          <WaterfallView spans={trace.spans} totalDuration={trace.total_duration_ms} />
        ) : (
          <TreeView traceId={traceId} />
        )}
      </div>

      {/* Error Details (if any errors in trace) */}
      {trace.status === 'ERROR' && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="font-semibold text-red-500">Errors in Trace</h3>
          </div>
          <div className="space-y-2">
            {trace.spans
              .filter(s => s.status === 'ERROR')
              .map(span => (
                <div key={span.span_id} className="rounded-xl bg-background border border-border p-3">
                  <code className="text-sm font-medium">{span.function_name}</code>
                  {span.error_code && (
                    <span className="ml-2 text-xs text-red-500">{span.error_code}</span>
                  )}
                  {span.error_message && (
                    <p className="text-xs text-muted-foreground mt-1">{span.error_message}</p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
