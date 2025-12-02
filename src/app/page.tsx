/**
 * Dashboard Overview Page
 * 
 * Bento Grid style interactive dashboard with Surfer theme.
 */

'use client';

import { useState, useMemo } from 'react';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  Clock, 
  PieChart,
  Coins,
  TrendingUp,
  RefreshCw,
  Waves,
} from 'lucide-react';
import { BentoDashboard, presetLayouts, LayoutSelector, EditModeToggle } from '@/components/dashboard/BentoDashboard';
import { SurferChart, FillModeSelector, type FillMode } from '@/components/dashboard/SurferChart';
import { KPICard } from '@/components/dashboard/KPICard';
import { FunctionDistribution } from '@/components/dashboard/FunctionDistribution';
import { RecentErrors } from '@/components/dashboard/RecentErrors';
import { SystemStatusCard } from '@/components/dashboard/SystemStatusCard';
import { TimeRangeSelector } from '@/components/ui/TimeRangeSelector';
import { 
  useKPIMetrics, 
  useSystemStatus,
  useTimeline,
  useFunctionDistribution,
  useRecentErrors,
  useTokenUsage,
  useErrorDistribution,
  useSlowestExecutions,
} from '@/lib/hooks/useApi';
import { formatNumber, formatDuration, formatPercentage } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

// ============ Widget Components ============

// KPI Widget - Total Executions
function KPIExecutionsWidget({ timeRange }: { timeRange: number }) {
  const { data: kpi, isLoading } = useKPIMetrics(timeRange);
  
  return (
    <div className="h-full flex flex-col justify-center">
      <p className="text-3xl font-bold tracking-tight">
        {isLoading ? '...' : formatNumber(kpi?.total_executions || 0)}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Total executions
      </p>
    </div>
  );
}

// KPI Widget - Success Rate
function KPISuccessWidget({ timeRange }: { timeRange: number }) {
  const { data: kpi, isLoading } = useKPIMetrics(timeRange);
  const successRate = kpi?.success_rate || 0;
  
  return (
    <div className="h-full flex flex-col justify-center">
      <p className={`text-3xl font-bold tracking-tight ${
        successRate >= 95 ? 'text-green-500' : 
        successRate >= 80 ? 'text-yellow-500' : 'text-red-500'
      }`}>
        {isLoading ? '...' : formatPercentage(successRate)}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Success rate
      </p>
    </div>
  );
}

// KPI Widget - Avg Duration
function KPIDurationWidget({ timeRange }: { timeRange: number }) {
  const { data: kpi, isLoading } = useKPIMetrics(timeRange);
  
  return (
    <div className="h-full flex flex-col justify-center">
      <p className="text-3xl font-bold tracking-tight">
        {isLoading ? '...' : formatDuration(kpi?.avg_duration_ms || 0)}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Avg duration
      </p>
    </div>
  );
}

// KPI Widget - Errors
function KPIErrorsWidget({ timeRange }: { timeRange: number }) {
  const { data: kpi, isLoading } = useKPIMetrics(timeRange);
  const errorCount = kpi?.error_count || 0;
  
  return (
    <div className="h-full flex flex-col justify-center">
      <p className={`text-3xl font-bold tracking-tight ${
        errorCount > 100 ? 'text-red-500' : 
        errorCount > 50 ? 'text-yellow-500' : 'text-foreground'
      }`}>
        {isLoading ? '...' : formatNumber(errorCount)}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Errors ({formatNumber(kpi?.cache_hit_count || 0)} cached)
      </p>
    </div>
  );
}

// Timeline Widget with SurferChart
function TimelineWidget({ timeRange, fillMode }: { timeRange: number; fillMode: FillMode }) {
  const bucketSize = Math.max(5, Math.floor(timeRange / 12));
  const { data: timeline } = useTimeline(timeRange, bucketSize);
  
  const chartData = useMemo(() => {
    if (!timeline) return [];
    return timeline.map((point) => ({
      name: new Date(point.timestamp).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: point.success + point.error + point.cache_hit,
      success: point.success,
      error: point.error,
      cache_hit: point.cache_hit,
    }));
  }, [timeline]);

  return (
    <SurferChart
      data={chartData}
      dataKey="value"
      fillMode={fillMode}
      strokeColor="#3B82F6"
      fillColor="#3B82F6"
      height={220}
      showGrid={true}
      showXAxis={true}
      showYAxis={true}
    />
  );
}

// Distribution Widget
function DistributionWidget({ limit = 6 }: { limit?: number }) {
  const { data: distribution } = useFunctionDistribution(limit);
  
  return (
    <FunctionDistribution data={distribution || []} />
  );
}

// Recent Errors Widget
function RecentErrorsWidget({ timeRange, limit = 5 }: { timeRange: number; limit?: number }) {
  const { data: errors } = useRecentErrors(timeRange, limit);
  
  return (
    <RecentErrors errors={errors?.items || []} />
  );
}

// Token Usage Widget
function TokenUsageWidget() {
  const { data: tokenUsage, isLoading } = useTokenUsage();
  
  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }
  
  const categories = tokenUsage?.by_category || {};
  const total = tokenUsage?.total_tokens || 0;
  
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-3xl font-bold">{formatNumber(total)}</p>
        <p className="text-sm text-muted-foreground">Total Tokens</p>
      </div>
      
      <div className="space-y-2">
        {Object.entries(categories).map(([category, count]) => (
          <div key={category} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground truncate">{category}</span>
            <span className="font-medium">{formatNumber(count as number)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Error Distribution Widget
function ErrorDistributionWidget({ timeRange }: { timeRange: number }) {
  const { data: distribution } = useErrorDistribution(timeRange);
  
  if (!distribution || distribution.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No errors in this period
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {distribution.slice(0, 5).map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="h-3 w-3 rounded-full" 
              style={{ backgroundColor: `hsl(${index * 50}, 70%, 50%)` }}
            />
            <span className="text-sm text-muted-foreground truncate max-w-[120px]">
              {item.name}
            </span>
          </div>
          <span className="text-sm font-medium">{formatNumber(item.count)}</span>
        </div>
      ))}
    </div>
  );
}

// Slowest Executions Widget
function SlowestWidget({ limit = 5 }: { limit?: number }) {
  const { data: slowest, isLoading } = useSlowestExecutions(limit);
  
  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }
  
  const items = slowest?.items || [];
  
  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No data
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {items.map((exec, index) => (
        <div 
          key={exec.span_id} 
          className="flex items-center justify-between py-2 border-b border-border last:border-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
            <code className="text-sm truncate">{exec.function_name}</code>
          </div>
          <span className="text-sm font-medium text-orange-500 shrink-0">
            {formatDuration(exec.duration_ms)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============ Main Page Component ============
export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState(1440);
  const [fillMode, setFillMode] = useState<FillMode>('gradient');
  const [currentLayout, setCurrentLayout] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: status } = useSystemStatus();

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  // Define widgets
  const widgets = useMemo(() => [
    {
      id: 'kpi-executions',
      title: 'Total Executions',
      icon: <Activity className="h-4 w-4" />,
      component: <KPIExecutionsWidget timeRange={timeRange} />,
      minW: 2,
      minH: 2,
    },
    {
      id: 'kpi-success',
      title: 'Success Rate',
      icon: <Zap className="h-4 w-4" />,
      component: <KPISuccessWidget timeRange={timeRange} />,
      minW: 2,
      minH: 2,
    },
    {
      id: 'kpi-duration',
      title: 'Avg Duration',
      icon: <Clock className="h-4 w-4" />,
      component: <KPIDurationWidget timeRange={timeRange} />,
      minW: 2,
      minH: 2,
    },
    {
      id: 'kpi-errors',
      title: 'Errors',
      icon: <AlertTriangle className="h-4 w-4" />,
      component: <KPIErrorsWidget timeRange={timeRange} />,
      minW: 2,
      minH: 2,
    },
    {
      id: 'timeline',
      title: 'Execution Timeline',
      icon: <TrendingUp className="h-4 w-4" />,
      component: <TimelineWidget timeRange={timeRange} fillMode={fillMode} />,
      minW: 4,
      minH: 3,
    },
    {
      id: 'distribution',
      title: 'Function Distribution',
      icon: <PieChart className="h-4 w-4" />,
      component: <DistributionWidget />,
      minW: 3,
      minH: 3,
    },
    {
      id: 'recent-errors',
      title: 'Recent Errors',
      icon: <AlertTriangle className="h-4 w-4" />,
      component: <RecentErrorsWidget timeRange={timeRange} />,
      minW: 4,
      minH: 3,
    },
    {
      id: 'token-usage',
      title: 'Token Usage',
      icon: <Coins className="h-4 w-4" />,
      component: <TokenUsageWidget />,
      minW: 3,
      minH: 3,
    },
    {
      id: 'error-distribution',
      title: 'Error Distribution',
      icon: <PieChart className="h-4 w-4" />,
      component: <ErrorDistributionWidget timeRange={timeRange} />,
      minW: 3,
      minH: 3,
    },
    {
      id: 'slowest',
      title: 'Slowest Executions',
      icon: <Clock className="h-4 w-4" />,
      component: <SlowestWidget />,
      minW: 4,
      minH: 3,
    },
  ], [timeRange, fillMode]);

  // Get current preset layout
  const layout = presetLayouts[currentLayout as keyof typeof presetLayouts] || presetLayouts.overview;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Waves className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Real-time monitoring overview
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Chart Style Selector */}
            <FillModeSelector value={fillMode} onChange={setFillMode} />
            
            {/* Layout Selector */}
            <LayoutSelector 
              currentLayout={currentLayout} 
              onSelect={setCurrentLayout} 
            />
            
            {/* Edit Mode Toggle */}
            <EditModeToggle 
              isEditing={isEditing} 
              onToggle={() => setIsEditing(!isEditing)} 
            />
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            
            {/* Time Range */}
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            
            {/* System Status */}
            <SystemStatusCard status={status} />
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="p-6">
        <BentoDashboard
          widgets={widgets}
          initialLayout={layout}
          columns={12}
          rowHeight={80}
          gap={16}
          editable={isEditing}
        />
      </main>
    </div>
  );
}
