/**
 * Functions Page - Function registry with hybrid search and detail modal
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Code2,
  Search,
  MessageSquare,
  Loader2,
  X,
  Sliders,
  Users,
  Clock,
  AlertTriangle,
  Zap,
  ExternalLink,
} from 'lucide-react';
import {
  useFunctions,
  useFunctionSearch,
  useFunctionHybridSearch,
  useFunction,
} from '@/lib/hooks/useApi';
import { useTranslation } from '@/lib/i18n';
import { formatNumber, formatDuration, formatPercentage, cn } from '@/lib/utils';
import type { FunctionInfo } from '@/lib/types/api';

// ============ Function Detail Modal ============
interface FunctionDetailModalProps {
  functionName: string | null;
  onClose: () => void;
}

function FunctionDetailModal({ functionName, onClose }: FunctionDetailModalProps) {
  const { data: func, isLoading } = useFunction(functionName || '');
  const { t } = useTranslation();

  if (!functionName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl border border-border bg-card shadow-2xl mx-4">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('functions.details')}</h2>
          </div>
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !func ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('functions.notFound')}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Function Name & Module */}
              <div>
                <code className="text-xl font-bold text-primary">{func.function_name}</code>
                {func.module && (
                  <p className="text-sm text-muted-foreground font-mono mt-1">{func.module}</p>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {func.team && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Users className="h-3 w-3" />
                    {func.team}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <Zap className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{formatNumber(func.execution_count || 0)}</p>
                  <p className="text-xs text-muted-foreground">{t('functions.executions')}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{formatDuration(func.avg_duration_ms || 0)}</p>
                  <p className="text-xs text-muted-foreground">{t('functions.avgDuration')}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-red-500" />
                  <p className={cn(
                    "text-2xl font-bold",
                    (func.error_rate || 0) > 5 ? 'text-red-500' : ''
                  )}>
                    {formatPercentage(func.error_rate || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('functions.errorRate')}</p>
                </div>
              </div>

              {/* Description */}
              {func.description && (
                <div>
                  <h3 className="text-sm font-medium mb-2">{t('functions.description')}</h3>
                  <p className="text-sm text-muted-foreground">{func.description}</p>
                </div>
              )}

              {/* Docstring */}
              {func.docstring && (
                <div>
                  <h3 className="text-sm font-medium mb-2">{t('functions.docstring')}</h3>
                  <pre className="rounded-xl bg-muted p-4 text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                    {func.docstring}
                  </pre>
                </div>
              )}

              {/* Source Code */}
              {func.source_code && (
                <div>
                  <h3 className="text-sm font-medium mb-2">{t('functions.sourceCode')}</h3>
                  <pre className="rounded-xl bg-muted p-4 text-xs overflow-auto max-h-60 font-mono">
                    <code>{func.source_code}</code>
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-border flex-wrap">
                <a
                  href={`/executions?function_name=${encodeURIComponent(func.function_name)}`}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {t('functions.viewExecutions')}
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={`/errors?function_name=${encodeURIComponent(func.function_name)}`}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t('functions.viewErrors')}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Search Mode Selector ============
type SearchMode = 'semantic' | 'hybrid';

interface SearchModeSelectorProps {
  value: SearchMode;
  onChange: (mode: SearchMode) => void;
}

function SearchModeSelector({ value, onChange }: SearchModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
      <button
        onClick={() => onChange('semantic')}
        className={cn(
          'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
          value === 'semantic'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t('functions.semantic')}
      </button>
      <button
        onClick={() => onChange('hybrid')}
        className={cn(
          'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
          value === 'hybrid'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {t('functions.hybrid')}
      </button>
    </div>
  );
}

// ============ Alpha Slider ============
interface AlphaSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function AlphaSlider({ value, onChange }: AlphaSliderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{t('functions.keyword')}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value * 100}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-24 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap">{t('functions.vector')}</span>
      <span className="text-xs font-medium w-8">{Math.round(value * 100)}%</span>
    </div>
  );
}

// ============ Ask AI Section ============
function AskAISection() {
  const [askQuery, setAskQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askResult, setAskResult] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleAsk = async () => {
    if (!askQuery.trim()) return;
    setIsAsking(true);
    setAskResult(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/functions/ask?q=${encodeURIComponent(askQuery)}&language=ko`
      );
      const data = await res.json();
      setAskResult(data.answer);
    } catch (error) {
      setAskResult('질문 처리 중 오류가 발생했습니다.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">{t('functions.askAI')}</h3>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t('functions.askPlaceholder')}
          value={askQuery}
          onChange={(e) => setAskQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleAsk}
          disabled={isAsking || !askQuery.trim()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : t('functions.ask')}
        </button>
      </div>

      {askResult && (
        <div className="mt-4 rounded-xl bg-background border border-border p-4">
          <p className="text-sm whitespace-pre-wrap">{askResult}</p>
        </div>
      )}
    </div>
  );
}

// ============ Function Card ============
interface FunctionCardProps {
  func: FunctionInfo;
  onClick: () => void;
}

function FunctionCard({ func, onClick }: FunctionCardProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Code2 className="h-4 w-4 text-primary shrink-0" />
            <code className="text-sm font-semibold truncate">{func.function_name}</code>
          </div>

          {func.module && (
            <p className="text-xs text-muted-foreground font-mono truncate mb-2">
              {func.module}
            </p>
          )}

          {func.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {func.description}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {func.team && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {func.team}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {func.execution_count !== undefined && (
            <div className="text-right">
              <p className="text-sm font-semibold">{formatNumber(func.execution_count)}</p>
              <p className="text-xs text-muted-foreground">{t('functions.runs')}</p>
            </div>
          )}
          {func.error_rate !== undefined && func.error_rate > 0 && (
            <span className={cn(
              "text-xs font-medium",
              func.error_rate > 5 ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {formatPercentage(func.error_rate)} {t('functions.errors')}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ============ Main Page Component ============
export default function FunctionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('semantic');
  const [alpha, setAlpha] = useState(0.5);
  const [teamFilter, setTeamFilter] = useState('');
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const { t } = useTranslation();

  // Fetch data based on search mode
  const { data: allFunctions, isLoading: loadingAll } = useFunctions();
  const { data: semanticResults, isLoading: loadingSemantic } = useFunctionSearch(
    searchMode === 'semantic' ? searchQuery : '',
    20
  );
  const { data: hybridResults, isLoading: loadingHybrid } = useFunctionHybridSearch(
    searchMode === 'hybrid' ? searchQuery : '',
    alpha,
    20
  );

  // Determine which results to show
  const functions = useMemo(() => {
    let results: FunctionInfo[] = [];

    if (searchQuery) {
      results = searchMode === 'semantic'
        ? (semanticResults?.items || [])
        : (hybridResults?.items || []);
    } else {
      results = allFunctions?.items || [];
    }

    // Apply team filter
    if (teamFilter) {
      results = results.filter(f =>
        f.team?.toLowerCase().includes(teamFilter.toLowerCase())
      );
    }

    return results;
  }, [searchQuery, searchMode, semanticResults, hybridResults, allFunctions, teamFilter]);

  const isLoading = searchQuery
    ? (searchMode === 'semantic' ? loadingSemantic : loadingHybrid)
    : loadingAll;

  // Get unique teams for filter suggestions
  const teams = useMemo(() => {
    const allTeams = (allFunctions?.items || [])
      .map(f => f.team)
      .filter((t): t is string => !!t);
    return [...new Set(allTeams)];
  }, [allFunctions]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('functions.title')}</h1>
        <p className="text-muted-foreground">
          {t('functions.subtitle')}
        </p>
      </div>

      {/* Ask AI */}
      <AskAISection />

      {/* Search & Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('functions.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Search Mode */}
          <SearchModeSelector value={searchMode} onChange={setSearchMode} />

          {/* Team Filter */}
          <div className="relative">
            <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('executions.team') + "..."}
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              list="teams"
              className="w-28 rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <datalist id="teams">
              {teams.map(team => (
                <option key={team} value={team} />
              ))}
            </datalist>
          </div>

          {/* Clear */}
          {(searchQuery || teamFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTeamFilter('');
              }}
              className="flex items-center gap-1 rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3" />
              {t('common.clear')}
            </button>
          )}
        </div>

        {/* Hybrid Search Options */}
        {searchMode === 'hybrid' && searchQuery && (
          <div className="flex items-center gap-4 pt-2 border-t border-border">
            <Sliders className="h-4 w-4 text-muted-foreground" />
            <AlphaSlider value={alpha} onChange={setAlpha} />
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {functions.length} {t('nav.functions').toLowerCase()}
        </span>
      </div>

      {/* Functions Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : functions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Code2 className="h-12 w-12 mb-4 opacity-50" />
          <p>{t('functions.noFunctions')}</p>
          {searchQuery && (
            <p className="text-sm mt-1">{t('functions.tryDifferent')}</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {functions.map((func, index) => (
            <FunctionCard
              key={`${func.function_name}-${index}`}
              func={func}
              onClick={() => setSelectedFunction(func.function_name)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <FunctionDetailModal
        functionName={selectedFunction}
        onClose={() => setSelectedFunction(null)}
      />
    </div>
  );
}
