/**
 * Replay Page - Regression testing with improved UI
 */

'use client';

import { useState } from 'react';
import { 
  RotateCcw, 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Sparkles,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { useReplayableFunctions, useRunReplay, useRunSemanticReplay } from '@/lib/hooks/useApi';
import { timeAgo, formatNumber, cn } from '@/lib/utils';
import type { ReplayResult, ReplayFailure } from '@/lib/types/api';

// ============ Test Mode Selector ============
type TestMode = 'exact' | 'semantic';

interface TestModeSelectorProps {
  value: TestMode;
  onChange: (mode: TestMode) => void;
}

function TestModeSelector({ value, onChange }: TestModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
      <button
        onClick={() => onChange('exact')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
          value === 'exact'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Zap className="h-3 w-3" />
        Exact Match
      </button>
      <button
        onClick={() => onChange('semantic')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
          value === 'semantic'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Sparkles className="h-3 w-3" />
        Semantic
      </button>
    </div>
  );
}

// ============ Result Summary ============
interface ResultSummaryProps {
  result: ReplayResult;
}

function ResultSummary({ result }: ResultSummaryProps) {
  const passRate = result.total > 0 ? (result.passed / result.total) * 100 : 0;
  
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold">Test Results</h3>
        {result.mode && (
          <span className="text-xs text-muted-foreground">
            Mode: {result.mode}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl bg-muted/50 p-4 text-center">
          <p className="text-3xl font-bold">{result.total}</p>
          <p className="text-xs text-muted-foreground mt-1">Total</p>
        </div>
        <div className="rounded-xl bg-green-500/10 p-4 text-center">
          <p className="text-3xl font-bold text-green-500">{result.passed}</p>
          <p className="text-xs text-muted-foreground mt-1">Passed</p>
        </div>
        <div className="rounded-xl bg-red-500/10 p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{result.failed}</p>
          <p className="text-xs text-muted-foreground mt-1">Failed</p>
        </div>
        <div className="rounded-xl bg-blue-500/10 p-4 text-center">
          <p className="text-3xl font-bold text-blue-500">{result.updated}</p>
          <p className="text-xs text-muted-foreground mt-1">Updated</p>
        </div>
      </div>

      {/* Pass Rate Bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Pass Rate</span>
          <span className={cn(
            'font-semibold',
            passRate >= 90 ? 'text-green-500' : passRate >= 70 ? 'text-yellow-500' : 'text-red-500'
          )}>
            {passRate.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              passRate >= 90 ? 'bg-green-500' : passRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${passRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============ Failure Details ============
interface FailureDetailsProps {
  failures: ReplayFailure[];
}

function FailureDetails({ failures }: FailureDetailsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!failures || failures.length === 0) return null;

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
      <div className="flex items-center gap-2 mb-4">
        <XCircle className="h-4 w-4 text-red-500" />
        <h3 className="font-semibold text-red-500">Failed Tests ({failures.length})</h3>
      </div>

      <div className="space-y-2">
        {failures.map((failure, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-background overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedIndex === index ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">Test #{index + 1}</span>
                {failure.similarity !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    Similarity: {(failure.similarity * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <XCircle className="h-4 w-4 text-red-500" />
            </button>

            {/* Details */}
            {expandedIndex === index && (
              <div className="border-t border-border p-3 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Input</p>
                  <pre className="rounded-lg bg-muted p-2 text-xs overflow-auto max-h-24">
                    {failure.input}
                  </pre>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Expected</p>
                    <pre className="rounded-lg bg-green-500/10 p-2 text-xs overflow-auto max-h-24 text-green-400">
                      {failure.expected}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Actual</p>
                    <pre className="rounded-lg bg-red-500/10 p-2 text-xs overflow-auto max-h-24 text-red-400">
                      {failure.actual}
                    </pre>
                  </div>
                </div>
                {failure.diff_html && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Diff</p>
                    <div 
                      className="rounded-lg bg-muted p-2 text-xs overflow-auto max-h-32"
                      dangerouslySetInnerHTML={{ __html: failure.diff_html }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Function Card ============
interface FunctionCardProps {
  func: {
    function_name: string;
    log_count: number;
    latest_timestamp: string;
  };
  isSelected: boolean;
  onClick: () => void;
}

function FunctionCard({ func, isSelected, onClick }: FunctionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border bg-card hover:border-primary/50'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <code className="text-sm font-semibold truncate">{func.function_name}</code>
        {isSelected && (
          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <RotateCcw className="h-3 w-3" />
          {formatNumber(func.log_count)} logs
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo(func.latest_timestamp)}
        </span>
      </div>
    </button>
  );
}

// ============ Main Page Component ============
export default function ReplayPage() {
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [testLimit, setTestLimit] = useState(10);
  const [testMode, setTestMode] = useState<TestMode>('exact');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.85);
  const [updateBaseline, setUpdateBaseline] = useState(false);
  const [result, setResult] = useState<ReplayResult | null>(null);

  const { data: functions, isLoading } = useReplayableFunctions();
  const runReplay = useRunReplay();
  const runSemanticReplay = useRunSemanticReplay();

  const handleRunTest = async () => {
    if (!selectedFunction) return;

    setResult(null);

    try {
      if (testMode === 'semantic') {
        const res = await runSemanticReplay.mutateAsync({
          functionFullName: selectedFunction,
          options: { 
            limit: testLimit, 
            updateBaseline,
            similarityThreshold,
            semanticEval: true,
          },
        });
        setResult(res);
      } else {
        const res = await runReplay.mutateAsync({
          functionFullName: selectedFunction,
          limit: testLimit,
          updateBaseline,
        });
        setResult(res);
      }
    } catch (error) {
      console.error('Replay failed:', error);
    }
  };

  const isRunning = runReplay.isPending || runSemanticReplay.isPending;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Replay</h1>
        <p className="text-muted-foreground">
          Run regression tests using recorded inputs/outputs
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Function List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Replayable Functions</h3>
            <span className="text-xs text-muted-foreground">
              {functions?.total || 0} available
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-auto pr-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))
            ) : !functions?.items || functions.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <RotateCcw className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">No replayable functions</p>
                <p className="text-xs mt-1">
                  Functions with replay=True will appear here
                </p>
              </div>
            ) : (
              functions.items.map((func) => (
                <FunctionCard
                  key={func.function_name}
                  func={func}
                  isSelected={selectedFunction === func.function_name}
                  onClick={() => setSelectedFunction(func.function_name)}
                />
              ))
            )}
          </div>
        </div>

        {/* Configuration & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Configuration */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">Test Configuration</h3>

            <div className="grid gap-4 md:grid-cols-2 mb-4">
              {/* Selected Function */}
              <div>
                <label className="block text-sm font-medium mb-2">Selected Function</label>
                <div className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm">
                  {selectedFunction || (
                    <span className="text-muted-foreground">Select from list</span>
                  )}
                </div>
              </div>

              {/* Test Limit */}
              <div>
                <label className="block text-sm font-medium mb-2">Test Cases</label>
                <input
                  type="number"
                  value={testLimit}
                  onChange={(e) => setTestLimit(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Test Mode */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Test Mode</span>
              <TestModeSelector value={testMode} onChange={setTestMode} />
            </div>

            {/* Semantic Options */}
            {testMode === 'semantic' && (
              <div className="rounded-xl bg-muted/50 p-4 mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Similarity Threshold</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={50}
                      max={100}
                      value={similarityThreshold * 100}
                      onChange={(e) => setSimilarityThreshold(Number(e.target.value) / 100)}
                      className="w-24 accent-primary"
                    />
                    <span className="text-sm font-medium w-12">
                      {(similarityThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Uses LLM to compare outputs semantically instead of exact matching
                </p>
              </div>
            )}

            {/* Update Baseline */}
            <label className="flex items-center gap-2 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={updateBaseline}
                onChange={(e) => setUpdateBaseline(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Update baseline on mismatch</span>
            </label>

            {/* Run Button */}
            <button
              onClick={handleRunTest}
              disabled={!selectedFunction || isRunning}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? 'Running Tests...' : 'Run Tests'}
            </button>
          </div>

          {/* Results */}
          {result && (
            <>
              <ResultSummary result={result} />
              <FailureDetails failures={result.failures} />
            </>
          )}

          {/* Empty State */}
          {!result && !isRunning && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <RotateCcw className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">Regression Testing</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Select a function and click "Run Tests" to replay recorded executions
                and compare outputs against baselines.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
