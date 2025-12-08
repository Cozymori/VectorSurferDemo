/**
 * Dashboard Overview Page
 *
 * Bento Grid style interactive dashboard with Surfer theme.
 * Uses Zustand for global state (timeRange, fillMode)
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
import { BentoDashboard, EditModeToggle } from '@/components/dashboard/BentoDashboard';
import { SurferChart } from '@/components/dashboard/SurferChart';
import { KPICard } from '@/components/dashboard/KPICard';
import { RecentErrors } from '@/components/dashboard/RecentErrors';
import { SystemStatusCard } from '@/components/dashboard/SystemStatusCard';
import { TimeRangeSelector, FillModeSelector } from '@/components/ui/TimeRangeSelector';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useDashboardStore } from '@/lib/stores/useDashboardStore';
import { useTranslation } from '@/lib/i18n';
import {
    useKPIMetrics,
    useSystemStatus,
    useTimeline,
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
    const { t } = useTranslation();

    return (
        <div className="h-full flex flex-col justify-center">
            <p className="text-3xl font-bold tracking-tight">
                {isLoading ? '...' : formatNumber(kpi?.total_executions || 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
                {t('dashboard.totalExecutions')}
            </p>
        </div>
    );
}

// KPI Widget - Success Rate
function KPISuccessWidget({ timeRange }: { timeRange: number }) {
    const { data: kpi, isLoading } = useKPIMetrics(timeRange);
    const { t } = useTranslation();
    const successRate = kpi?.success_rate || 0;

    return (
        <div className="h-full flex flex-col justify-center">
            <p className={`text-3xl font-bold tracking-tight ${successRate >= 95 ? 'text-green-500' :
                successRate >= 80 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                {isLoading ? '...' : formatPercentage(successRate)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
                {t('dashboard.successRate')}
            </p>
        </div>
    );
}

// KPI Widget - Avg Duration
function KPIDurationWidget({ timeRange }: { timeRange: number }) {
    const { data: kpi, isLoading } = useKPIMetrics(timeRange);
    const { t } = useTranslation();

    return (
        <div className="h-full flex flex-col justify-center">
            <p className="text-3xl font-bold tracking-tight">
                {isLoading ? '...' : formatDuration(kpi?.avg_duration_ms || 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
                {t('dashboard.avgDuration')}
            </p>
        </div>
    );
}

// KPI Widget - Errors
function KPIErrorsWidget({ timeRange }: { timeRange: number }) {
    const { data: kpi, isLoading } = useKPIMetrics(timeRange);
    const { t } = useTranslation();
    const errorCount = kpi?.error_count || 0;

    return (
        <div className="h-full flex flex-col justify-center">
            <p className={`text-3xl font-bold tracking-tight ${errorCount > 100 ? 'text-red-500' :
                errorCount > 50 ? 'text-yellow-500' : 'text-foreground'
                }`}>
                {isLoading ? '...' : formatNumber(errorCount)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
                {t('dashboard.errors')} ({formatNumber(kpi?.cache_hit_count || 0)} {t('dashboard.cached')})
            </p>
        </div>
    );
}

// Timeline Widget with SurferChart (uses global fillMode)
function TimelineWidget({ timeRange }: { timeRange: number }) {
    const { fillMode } = useDashboardStore();
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
            strokeColor="#ec5a53"
            fillColor="#ec5a53"
            height={220}
            showGrid={true}
            showXAxis={true}
            showYAxis={true}
        />
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
    const { t } = useTranslation();

    if (isLoading) {
        return <div className="text-muted-foreground">{t('common.loading')}</div>;
    }

    const categories = tokenUsage?.by_category || {};
    const total = tokenUsage?.total_tokens || 0;

    return (
        <div className="space-y-4">
            <div className="text-center">
                <p className="text-3xl font-bold">{formatNumber(total)}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.totalTokens')}</p>
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
    const { t } = useTranslation();

    if (!distribution || distribution.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                {t('dashboard.noErrorsInPeriod')}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {distribution.slice(0, 5).map((item, index) => {
                const errorItem = item as { name?: string; error_code?: string; count: number };
                const displayName = errorItem.name || errorItem.error_code || 'Unknown';

                return (
                    <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: `hsl(${index * 50}, 70%, 50%)` }}
                            />
                            <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                                {displayName}
                            </span>
                        </div>
                        <span className="text-sm font-medium">{formatNumber(item.count)}</span>
                    </div>
                );
            })}
        </div>
    );
}

// Slowest Executions Widget
function SlowestWidget({ limit = 5 }: { limit?: number }) {
    const { data: slowest, isLoading } = useSlowestExecutions(limit);
    const { t } = useTranslation();

    if (isLoading) {
        return <div className="text-muted-foreground">{t('common.loading')}</div>;
    }

    const items = slowest?.items || [];

    if (items.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                {t('common.noData')}
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
    // Global state from Zustand - timeRangeMinutes는 이제 반응성 있는 상태값
    const { timeRangeMinutes, fillMode } = useDashboardStore();
    const { t } = useTranslation();

    // Local state
    const [isEditing, setIsEditing] = useState(false);

    const queryClient = useQueryClient();
    const { data: status } = useSystemStatus();

    const handleRefresh = () => {
        queryClient.invalidateQueries();
    };

    // Define widgets with optimized grid layout (12 col grid)
    // Row 1: KPI cards (3+3+3+3=12)
    // Row 2: Timeline (12)
    // Row 3: Token Usage + Recent Errors (6+6=12)
    // Row 4: Slowest + Error Distribution (9+3=12) - 3:1 ratio
    const widgets = useMemo(() => [
        {
            id: 'kpi-executions',
            title: t('dashboard.totalExecutions'),
            icon: <Activity className="h-4 w-4" />,
            component: <KPIExecutionsWidget timeRange={timeRangeMinutes} />,
            minW: 3,
            minH: 2,
        },
        {
            id: 'kpi-success',
            title: t('dashboard.successRate'),
            icon: <Zap className="h-4 w-4" />,
            component: <KPISuccessWidget timeRange={timeRangeMinutes} />,
            minW: 3,
            minH: 2,
        },
        {
            id: 'kpi-duration',
            title: t('dashboard.avgDuration'),
            icon: <Clock className="h-4 w-4" />,
            component: <KPIDurationWidget timeRange={timeRangeMinutes} />,
            minW: 3,
            minH: 2,
        },
        {
            id: 'kpi-errors',
            title: t('dashboard.errors'),
            icon: <AlertTriangle className="h-4 w-4" />,
            component: <KPIErrorsWidget timeRange={timeRangeMinutes} />,
            minW: 3,
            minH: 2,
        },
        {
            id: 'timeline',
            title: t('dashboard.executionTimeline'),
            icon: <TrendingUp className="h-4 w-4" />,
            component: <TimelineWidget timeRange={timeRangeMinutes} />,
            minW: 12,
            minH: 4,
        },
        {
            id: 'token-usage',
            title: t('dashboard.tokenUsage'),
            icon: <Coins className="h-4 w-4" />,
            component: <TokenUsageWidget />,
            minW: 6,
            minH: 4,
        },
        {
            id: 'recent-errors',
            title: t('dashboard.recentErrors'),
            icon: <AlertTriangle className="h-4 w-4" />,
            component: <RecentErrorsWidget timeRange={timeRangeMinutes} />,
            minW: 6,
            minH: 4,
        },
        {
            id: 'slowest',
            title: t('dashboard.slowestExecutions'),
            icon: <Clock className="h-4 w-4" />,
            component: <SlowestWidget />,
            minW: 9,
            minH: 4,
        },
        {
            id: 'error-distribution',
            title: t('dashboard.errorDistribution'),
            icon: <PieChart className="h-4 w-4" />,
            component: <ErrorDistributionWidget timeRange={timeRangeMinutes} />,
            minW: 3,
            minH: 4,
        },
    ], [timeRangeMinutes, fillMode, t]);

    // Explicit layout: x, y, w, h for each widget
    const dashboardLayout = useMemo(() => [
        // Row 1: KPIs (y=0)
        { i: 'kpi-executions', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'kpi-success', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'kpi-duration', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'kpi-errors', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        // Row 2: Timeline (y=2)
        { i: 'timeline', x: 0, y: 2, w: 12, h: 4, minW: 6, minH: 3 },
        // Row 3: Error Distribution + Recent Errors (y=6)
        { i: 'error-distribution', x: 0, y: 6, w: 6, h: 4, minW: 3, minH: 3 },
        { i: 'recent-errors', x: 6, y: 6, w: 6, h: 4, minW: 3, minH: 3 },
        // Row 4: Slowest + Token Usage (y=10) - 3:1 ratio, h=2
        { i: 'slowest', x: 0, y: 10, w: 9, h: 2, minW: 4, minH: 2 },
        { i: 'token-usage', x: 9, y: 10, w: 3, h: 2, minW: 2, minH: 2 },
    ], []);


    return (
        <div className="min-h-screen bg-background">
            {/* Header - Mobile Responsive */}
            <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
                <div className="px-4 md:px-6 py-3">
                    {/* Single Row Layout with wrap */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Title */}
                        <div className="flex items-center gap-2 ml-10 md:ml-0 min-w-0">
                            <Waves className="h-5 w-5 text-primary shrink-0" />
                            <h1 className="text-lg font-bold tracking-tight truncate">{t('dashboard.title')}</h1>
                        </div>

                        {/* Spacer */}
                        <div className="flex-1 min-w-[20px]" />

                        {/* Controls Group */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Chart Style - Hidden on small */}
                            <div className="hidden md:block">
                                <FillModeSelector />
                            </div>

                            {/* Edit Mode - Hidden on small */}
                            <div className="hidden md:block">
                                <EditModeToggle
                                    isEditing={isEditing}
                                    onToggle={() => setIsEditing(!isEditing)}
                                />
                            </div>

                            {/* Refresh Button */}
                            <button
                                onClick={handleRefresh}
                                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 text-sm font-medium transition-colors hover:bg-muted"
                                title={t('common.refresh')}
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>

                            {/* Time Range */}
                            <TimeRangeSelector />

                            {/* System Status - Hidden on small */}
                            <div className="hidden lg:block">
                                <SystemStatusCard status={status} />
                            </div>

                            {/* Language Switcher */}
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </header>

            {/* Dashboard Content */}
            <main className="p-4 md:p-6">
                <BentoDashboard
                    widgets={widgets}
                    initialLayout={dashboardLayout}
                    columns={12}
                    rowHeight={80}
                    gap={16}
                    editable={isEditing}
                />
            </main>
        </div>
    );
}
