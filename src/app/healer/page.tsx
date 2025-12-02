/**
 * Healer Page - AI-powered bug diagnosis with batch support
 */

'use client';

import { useState } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Loader2, 
  Code, 
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useHealableFunctions, useDiagnose, useBatchDiagnose } from '@/lib/hooks/useApi';
import { timeAgo, formatNumber, cn } from '@/lib/utils';
import type { DiagnosisResult } from '@/lib/types/api';

// ============ Code Block with Copy ============
interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language = 'typescript' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl bg-muted overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-auto max-h-80">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ============ Diagnosis Result Card ============
interface DiagnosisCardProps {
  result: DiagnosisResult;
}

function DiagnosisCard({ result }: DiagnosisCardProps) {
  const statusColors = {
    success: 'border-green-500/30 bg-green-500/5',
    no_errors: 'border-blue-500/30 bg-blue-500/5',
    error: 'border-red-500/30 bg-red-500/5',
  };

  const statusIcons = {
    success: <Lightbulb className="h-5 w-5 text-green-500" />,
    no_errors: <CheckCircle className="h-5 w-5 text-blue-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
  };

  return (
    <div className={cn('rounded-2xl border p-6', statusColors[result.status])}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {statusIcons[result.status]}
          <div>
            <h3 className="font-semibold">Diagnosis Result</h3>
            <p className="text-xs text-muted-foreground">
              Lookback: {result.lookback_minutes} minutes
            </p>
          </div>
        </div>
        <span className={cn(
          'rounded-full px-3 py-1 text-xs font-medium',
          result.status === 'success' && 'bg-green-500/20 text-green-400',
          result.status === 'no_errors' && 'bg-blue-500/20 text-blue-400',
          result.status === 'error' && 'bg-red-500/20 text-red-400'
        )}>
          {result.status === 'success' ? 'Fix Suggested' : 
           result.status === 'no_errors' ? 'No Errors Found' : 'Analysis Failed'}
        </span>
      </div>

      {/* Diagnosis */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Analysis
        </h4>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {result.diagnosis}
        </p>
      </div>

      {/* Suggested Fix */}
      {result.suggested_fix && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" />
            Suggested Fix
          </h4>
          <CodeBlock code={result.suggested_fix} />
        </div>
      )}
    </div>
  );
}

// ============ Function Card ============
interface FunctionCardProps {
  func: {
    function_name: string;
    error_count: number;
    error_codes: string[];
    latest_error_time: string;
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
        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400 shrink-0">
          {formatNumber(func.error_count)} errors
        </span>
      </div>
      
      {/* Error Codes */}
      <div className="flex flex-wrap gap-1 mb-2">
        {func.error_codes.slice(0, 3).map((code) => (
          <span
            key={code}
            className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
          >
            {code}
          </span>
        ))}
        {func.error_codes.length > 3 && (
          <span className="text-xs text-muted-foreground">
            +{func.error_codes.length - 3} more
          </span>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Last error: {timeAgo(func.latest_error_time)}
      </p>
    </button>
  );
}

// ============ Main Page Component ============
export default function HealerPage() {
  const [timeRange, setTimeRange] = useState(1440);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [lookback, setLookback] = useState(60);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [batchMode, setBatchMode] = useState(false);

  const { data: functions, isLoading, refetch } = useHealableFunctions(timeRange);
  const diagnose = useDiagnose();
  const batchDiagnose = useBatchDiagnose();

  const handleDiagnose = async () => {
    if (!selectedFunction) return;
    setDiagnosis(null);

    try {
      const result = await diagnose.mutateAsync({
        functionName: selectedFunction,
        lookbackMinutes: lookback,
      });
      setDiagnosis(result);
    } catch (error) {
      console.error('Diagnosis failed:', error);
    }
  };

  const handleBatchDiagnose = async () => {
    if (selectedFunctions.length === 0) return;
    
    try {
      await batchDiagnose.mutateAsync({
        functionNames: selectedFunctions,
        lookbackMinutes: lookback,
      });
      // Results would be shown in a different way for batch
    } catch (error) {
      console.error('Batch diagnosis failed:', error);
    }
  };

  const toggleFunctionSelection = (funcName: string) => {
    if (batchMode) {
      setSelectedFunctions(prev => 
        prev.includes(funcName)
          ? prev.filter(f => f !== funcName)
          : [...prev, funcName]
      );
    } else {
      setSelectedFunction(funcName);
    }
  };

  const isRunning = diagnose.isPending || batchDiagnose.isPending;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Healer
          </h1>
          <p className="text-muted-foreground">
            AI-powered bug diagnosis and fix suggestions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Batch Mode Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={batchMode}
              onChange={(e) => {
                setBatchMode(e.target.checked);
                setSelectedFunctions([]);
                setSelectedFunction(null);
              }}
              className="rounded border-border"
            />
            <span className="text-sm">Batch Mode</span>
          </label>
          
          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm"
          >
            <option value={60}>Last 1 hour</option>
            <option value={360}>Last 6 hours</option>
            <option value={1440}>Last 24 hours</option>
            <option value={4320}>Last 3 days</option>
          </select>
          
          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="rounded-xl border border-border p-2 hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Function List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Functions with Errors</h3>
            {batchMode && selectedFunctions.length > 0 && (
              <span className="text-xs text-primary">
                {selectedFunctions.length} selected
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-auto pr-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
              ))
            ) : !functions?.items || functions.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mb-3 text-green-500 opacity-50" />
                <p className="text-sm font-medium">No errors found!</p>
                <p className="text-xs mt-1">Everything looks healthy</p>
              </div>
            ) : (
              functions.items.map((func) => (
                <FunctionCard
                  key={func.function_name}
                  func={func}
                  isSelected={
                    batchMode
                      ? selectedFunctions.includes(func.function_name)
                      : selectedFunction === func.function_name
                  }
                  onClick={() => toggleFunctionSelection(func.function_name)}
                />
              ))
            )}
          </div>
        </div>

        {/* Configuration & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Configuration */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">Diagnosis Configuration</h3>

            <div className="grid gap-4 md:grid-cols-2 mb-6">
              {/* Selected Function(s) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {batchMode ? 'Selected Functions' : 'Selected Function'}
                </label>
                <div className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm min-h-[42px]">
                  {batchMode ? (
                    selectedFunctions.length > 0 ? (
                      <span>{selectedFunctions.length} functions selected</span>
                    ) : (
                      <span className="text-muted-foreground">Select from list</span>
                    )
                  ) : (
                    selectedFunction || (
                      <span className="text-muted-foreground">Select from list</span>
                    )
                  )}
                </div>
              </div>

              {/* Lookback */}
              <div>
                <label className="block text-sm font-medium mb-2">Lookback (minutes)</label>
                <input
                  type="number"
                  value={lookback}
                  onChange={(e) => setLookback(Number(e.target.value))}
                  min={5}
                  max={1440}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={batchMode ? handleBatchDiagnose : handleDiagnose}
              disabled={batchMode ? selectedFunctions.length === 0 : !selectedFunction || isRunning}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isRunning ? 'Analyzing...' : batchMode ? 'Diagnose All' : 'Diagnose & Heal'}
            </button>
          </div>

          {/* Results */}
          {diagnosis && <DiagnosisCard result={diagnosis} />}

          {/* Empty State */}
          {!diagnosis && !isRunning && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">AI-Powered Diagnosis</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Select a function with errors and click "Diagnose & Heal" to get
                AI-generated insights and fix suggestions based on recent error patterns.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
