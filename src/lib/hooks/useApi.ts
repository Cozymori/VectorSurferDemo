/**
 * React Query Hooks for Data Fetching
 */

'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  analyticsService,
  executionsService,
  tracesService,
  functionsService,
  errorsService,
  healerService,
} from '../services/api';
import type { ExecutionFilters } from '../types/api';

// ============ Query Keys ============
export const queryKeys = {
  // Analytics
  systemStatus: ['analytics', 'status'] as const,
  kpiMetrics: (range: number) => ['analytics', 'kpi', range] as const,
  tokenUsage: ['analytics', 'tokens'] as const,
  timeline: (range: number, bucket: number) => ['analytics', 'timeline', range, bucket] as const,
  functionDistribution: (limit: number) => ['analytics', 'distribution', 'functions', limit] as const,
  errorDistribution: (range: number) => ['analytics', 'distribution', 'errors', range] as const,

  // Executions
  executions: (limit: number, offset: number, filters?: ExecutionFilters) =>
    ['executions', limit, offset, filters] as const,
  recentErrors: (minutes: number, limit: number) => ['executions', 'errors', minutes, limit] as const,
  slowestExecutions: (limit: number) => ['executions', 'slowest', limit] as const,
  execution: (spanId: string) => ['executions', spanId] as const,

  // Traces
  traces: (limit: number) => ['traces', limit] as const,
  trace: (traceId: string) => ['traces', traceId] as const,
  traceTree: (traceId: string) => ['traces', traceId, 'tree'] as const,
  traceAnalysis: (traceId: string, language: string) => ['traces', traceId, 'analysis', language] as const,

  // Functions
  functions: ['functions'] as const,
  functionSearch: (query: string, limit: number) => ['functions', 'search', query, limit] as const,
  functionHybridSearch: (query: string, alpha: number, limit: number) =>
    ['functions', 'search', 'hybrid', query, alpha, limit] as const,
  functionAsk: (query: string, language: string) => ['functions', 'ask', query, language] as const,
  function: (name: string) => ['functions', name] as const,

  // Errors
  errors: (limit: number, filters?: Partial<ExecutionFilters>) => ['errors', limit, filters] as const,
  errorSearch: (query: string, limit: number) => ['errors', 'search', query, limit] as const,
  errorSummary: (timeRange: number) => ['errors', 'summary', timeRange] as const,
  errorTrends: (timeRange: number, bucket: number) => ['errors', 'trends', timeRange, bucket] as const,

  // Healer
  healableFunctions: (timeRange: number) => ['healer', 'functions', timeRange] as const,
};

// ============ Analytics Hooks ============
export function useSystemStatus() {
  return useQuery({
    queryKey: queryKeys.systemStatus,
    queryFn: () => analyticsService.getSystemStatus(),
    refetchInterval: 30000, // Refresh every 30s
  });
}

export function useKPIMetrics(range: number = 60) {
  return useQuery({
    queryKey: queryKeys.kpiMetrics(range),
    queryFn: () => analyticsService.getKPIMetrics(range),
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useTokenUsage() {
  return useQuery({
    queryKey: queryKeys.tokenUsage,
    queryFn: () => analyticsService.getTokenUsage(),
  });
}

export function useTimeline(range: number = 60, bucket: number = 5) {
  return useQuery({
    queryKey: queryKeys.timeline(range, bucket),
    queryFn: () => analyticsService.getTimeline(range, bucket),
    refetchInterval: 60000,
  });
}

export function useFunctionDistribution(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.functionDistribution(limit),
    queryFn: () => analyticsService.getFunctionDistribution(limit),
  });
}

export function useErrorDistribution(range: number = 1440) {
  return useQuery({
    queryKey: queryKeys.errorDistribution(range),
    queryFn: () => analyticsService.getErrorDistribution(range),
  });
}

// ============ Executions Hooks ============
export function useExecutions(limit: number = 50, offset: number = 0, filters?: ExecutionFilters) {
  return useQuery({
    queryKey: queryKeys.executions(limit, offset, filters),
    queryFn: () => executionsService.getExecutions(limit, offset, filters),
  });
}

export function useRecentErrors(minutes: number = 60, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.recentErrors(minutes, limit),
    queryFn: () => executionsService.getRecentErrors(minutes, limit),
    refetchInterval: 30000,
  });
}

export function useSlowestExecutions(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.slowestExecutions(limit),
    queryFn: () => executionsService.getSlowestExecutions(limit),
  });
}

export function useExecution(spanId: string) {
  return useQuery({
    queryKey: queryKeys.execution(spanId),
    queryFn: () => executionsService.getExecutionById(spanId),
    enabled: !!spanId,
  });
}

// ============ Traces Hooks ============
export function useTraces(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.traces(limit),
    queryFn: () => tracesService.getRecentTraces(limit),
    refetchInterval: 30000,
  });
}

export function useTrace(traceId: string) {
  return useQuery({
    queryKey: queryKeys.trace(traceId),
    queryFn: () => tracesService.getTrace(traceId),
    enabled: !!traceId,
  });
}

export function useTraceTree(traceId: string) {
  return useQuery({
    queryKey: queryKeys.traceTree(traceId),
    queryFn: () => tracesService.getTraceTree(traceId),
    enabled: !!traceId,
  });
}

export function useTraceAnalysis(traceId: string, language: string = 'en') {
  return useQuery({
    queryKey: queryKeys.traceAnalysis(traceId, language),
    queryFn: () => tracesService.analyzeTrace(traceId, language),
    enabled: !!traceId,
    staleTime: Infinity, // LLM analysis doesn't change
  });
}

// ============ Functions Hooks ============
export function useFunctions() {
  return useQuery({
    queryKey: queryKeys.functions,
    queryFn: () => functionsService.getAllFunctions(),
  });
}

export function useFunctionSearch(query: string, limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.functionSearch(query, limit),
    queryFn: () => functionsService.searchFunctions(query, limit),
    enabled: query.length > 0,
  });
}

export function useFunctionHybridSearch(query: string, alpha: number = 0.5, limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.functionHybridSearch(query, alpha, limit),
    queryFn: () => functionsService.searchFunctionsHybrid(query, alpha, limit),
    enabled: query.length > 0,
  });
}

export function useFunctionAsk(query: string, language: string = 'en') {
  return useQuery({
    queryKey: queryKeys.functionAsk(query, language),
    queryFn: () => functionsService.askAboutFunction(query, language),
    enabled: query.length > 0,
    staleTime: Infinity,
  });
}

export function useFunction(name: string) {
  return useQuery({
    queryKey: queryKeys.function(name),
    queryFn: () => functionsService.getFunctionByName(name),
    enabled: !!name,
  });
}

// ============ Errors Hooks ============
export function useErrors(limit: number = 50, filters?: Partial<ExecutionFilters>) {
  return useQuery({
    queryKey: queryKeys.errors(limit, filters),
    queryFn: () => errorsService.getErrors(limit, filters),
  });
}

export function useErrorSearch(query: string, limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.errorSearch(query, limit),
    queryFn: () => errorsService.searchErrors(query, limit),
    enabled: query.length > 0,
  });
}

export function useErrorSummary(timeRange: number = 1440) {
  return useQuery({
    queryKey: queryKeys.errorSummary(timeRange),
    queryFn: () => errorsService.getErrorSummary(timeRange),
  });
}

export function useErrorTrends(timeRange: number = 1440, bucket: number = 60) {
  return useQuery({
    queryKey: queryKeys.errorTrends(timeRange, bucket),
    queryFn: () => errorsService.getErrorTrends(timeRange, bucket),
  });
}

// ============ Healer Hooks ============
export function useHealableFunctions(timeRange: number = 1440) {
  return useQuery({
    queryKey: queryKeys.healableFunctions(timeRange),
    queryFn: () => healerService.getHealableFunctions(timeRange),
  });
}

export function useDiagnose() {
  return useMutation({
    mutationFn: ({
      functionName,
      lookbackMinutes,
    }: {
      functionName: string;
      lookbackMinutes?: number;
    }) => healerService.diagnose(functionName, lookbackMinutes),
  });
}

export function useBatchDiagnose() {
  return useMutation({
    mutationFn: ({
      functionNames,
      lookbackMinutes,
    }: {
      functionNames: string[];
      lookbackMinutes?: number;
    }) => healerService.batchDiagnose(functionNames, lookbackMinutes),
  });
}
