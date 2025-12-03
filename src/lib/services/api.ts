/**
 * API Service Layer
 * 
 * Supports switching between mock and real API based on environment variable.
 * Set NEXT_PUBLIC_USE_MOCK=true for mock data.
 */

import type {
  SystemStatus,
  KPIMetrics,
  TokenUsage,
  TimelineDataPoint,
  DistributionItem,
  Execution,
  ExecutionFilters,
  TraceListItem,
  TraceDetail,
  TraceAnalysis,
  FunctionInfo,
  FunctionSearchResult,
  ErrorLog,
  ErrorSummary,
  ErrorTrend,
  HealableFunction,
  DiagnosisResult,
  PaginatedResponse,
} from '../types/api';

import * as mock from '../mock/data';

// ============ Config ============
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Simulate network delay for mock
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============ Analytics Service ============
export const analyticsService = {
  async getSystemStatus(): Promise<SystemStatus> {
    if (USE_MOCK) {
      await delay(200);
      return mock.mockSystemStatus;
    }
    return fetchAPI('/analytics/status');
  },

  async getKPIMetrics(range: number = 60): Promise<KPIMetrics> {
    if (USE_MOCK) {
      await delay(300);
      return mock.mockKPIMetrics;
    }
    return fetchAPI(`/analytics/kpi?range=${range}`);
  },

  async getTokenUsage(): Promise<TokenUsage> {
    if (USE_MOCK) {
      await delay(200);
      return mock.mockTokenUsage;
    }
    return fetchAPI('/analytics/tokens');
  },

  async getTimeline(range: number = 60, bucket: number = 5): Promise<TimelineDataPoint[]> {
    if (USE_MOCK) {
      await delay(300);
      return mock.mockTimeline;
    }
    return fetchAPI(`/analytics/timeline?range=${range}&bucket=${bucket}`);
  },

  async getFunctionDistribution(limit: number = 10): Promise<DistributionItem[]> {
    if (USE_MOCK) {
      await delay(200);
      return mock.mockFunctionDistribution;
    }
    return fetchAPI(`/analytics/distribution/functions?limit=${limit}`);
  },

  async getErrorDistribution(range: number = 1440): Promise<DistributionItem[]> {
    if (USE_MOCK) {
      await delay(200);
      return mock.mockErrorDistribution;
    }
    return fetchAPI(`/analytics/distribution/errors?range=${range}`);
  },
};

// ============ Executions Service ============
export const executionsService = {
  async getExecutions(
    limit: number = 50,
    offset: number = 0,
    filters?: ExecutionFilters
  ): Promise<PaginatedResponse<Execution>> {
    if (USE_MOCK) {
      await delay(300);
      return {
        items: mock.mockExecutions,
        total: mock.mockExecutions.length,
        limit,
        offset,
      };
    }

    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (filters?.status) params.append('status', filters.status);
    if (filters?.function_name) params.append('function_name', filters.function_name);
    if (filters?.team) params.append('team', filters.team);
    if (filters?.error_code) params.append('error_code', filters.error_code);
    if (filters?.time_range) params.append('time_range', String(filters.time_range));

    return fetchAPI(`/executions?${params}`);
  },

  async getRecentErrors(minutes: number = 60, limit: number = 20): Promise<{ items: Execution[]; total: number }> {
    if (USE_MOCK) {
      await delay(200);
      const errors = mock.mockExecutions.filter(e => e.status === 'ERROR');
      return { items: errors, total: errors.length };
    }
    return fetchAPI(`/executions/recent-errors?minutes=${minutes}&limit=${limit}`);
  },

  async getSlowestExecutions(limit: number = 10): Promise<{ items: Execution[]; total: number }> {
    if (USE_MOCK) {
      await delay(200);
      const sorted = [...mock.mockExecutions].sort((a, b) => b.duration_ms - a.duration_ms);
      return { items: sorted.slice(0, limit), total: sorted.length };
    }
    return fetchAPI(`/executions/slowest?limit=${limit}`);
  },

  async getExecutionById(spanId: string): Promise<Execution | null> {
    if (USE_MOCK) {
      await delay(150);
      return mock.mockExecutions.find(e => e.span_id === spanId) || null;
    }
    return fetchAPI(`/executions/${spanId}`);
  },
};

// ============ Traces Service ============
export const tracesService = {
  async getRecentTraces(limit: number = 20): Promise<TraceListItem[]> {
    if (USE_MOCK) {
      await delay(300);
      return mock.mockTraceList;
    }
    return fetchAPI(`/traces?limit=${limit}`);
  },

  async getTrace(traceId: string): Promise<TraceDetail> {
    if (USE_MOCK) {
      await delay(250);
      return { ...mock.mockTraceDetail, trace_id: traceId };
    }
    return fetchAPI(`/traces/${traceId}`);
  },

  async getTraceTree(traceId: string): Promise<{ trace_id: string; tree: unknown[] }> {
    if (USE_MOCK) {
      await delay(250);
      return { trace_id: traceId, tree: mock.mockTraceDetail.spans };
    }
    return fetchAPI(`/traces/${traceId}/tree`);
  },

  async analyzeTrace(traceId: string, language: string = 'en'): Promise<TraceAnalysis> {
    if (USE_MOCK) {
      await delay(1500); // LLM call takes longer
      return {
        trace_id: traceId,
        analysis: 'This trace shows a successful checkout flow with 4 spans. The payment processing took the longest at 567ms. All operations completed without errors.',
        language,
      };
    }
    return fetchAPI(`/traces/${traceId}/analyze?language=${language}`);
  },
};

// ============ Functions Service ============
export const functionsService = {
  async getAllFunctions(): Promise<{ items: FunctionInfo[]; total: number }> {
    if (USE_MOCK) {
      await delay(300);
      return { items: mock.mockFunctions, total: mock.mockFunctions.length };
    }
    return fetchAPI('/functions');
  },

  async searchFunctions(query: string, limit: number = 10): Promise<{ items: FunctionSearchResult[]; total: number }> {
    if (USE_MOCK) {
      await delay(400);
      const filtered = mock.mockFunctions.filter(f =>
        f.function_name.toLowerCase().includes(query.toLowerCase()) ||
        f.description?.toLowerCase().includes(query.toLowerCase())
      );
      return { items: filtered, total: filtered.length };
    }
    return fetchAPI(`/functions/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  async searchFunctionsHybrid(
    query: string,
    alpha: number = 0.5,
    limit: number = 10
  ): Promise<{ items: FunctionSearchResult[]; total: number }> {
    if (USE_MOCK) {
      await delay(400);
      return this.searchFunctions(query, limit);
    }
    return fetchAPI(`/functions/search/hybrid?q=${encodeURIComponent(query)}&alpha=${alpha}&limit=${limit}`);
  },

  async askAboutFunction(query: string, language: string = 'en'): Promise<{ query: string; answer: string }> {
    if (USE_MOCK) {
      await delay(1500);
      return {
        query,
        answer: 'Based on the registered functions, process_payment handles transaction processing with an average duration of 234ms and a 2.1% error rate.',
      };
    }
    return fetchAPI(`/functions/ask?q=${encodeURIComponent(query)}&language=${language}`);
  },

  async getFunctionByName(name: string): Promise<FunctionInfo | null> {
    if (USE_MOCK) {
      await delay(200);
      return mock.mockFunctions.find(f => f.function_name === name) || null;
    }
    return fetchAPI(`/functions/${encodeURIComponent(name)}`);
  },
};

// ============ Errors Service ============
export const errorsService = {
  async getErrors(limit: number = 50, filters?: Partial<ExecutionFilters>): Promise<{ items: ErrorLog[]; total: number }> {
    if (USE_MOCK) {
      await delay(300);
      return { items: mock.mockErrors, total: mock.mockErrors.length };
    }

    const params = new URLSearchParams({ limit: String(limit) });
    if (filters?.function_name) params.append('function_name', filters.function_name);
    if (filters?.error_code) params.append('error_code', filters.error_code);
    if (filters?.time_range) params.append('time_range', String(filters.time_range));

    return fetchAPI(`/errors?${params}`);
  },

  async searchErrors(query: string, limit: number = 10): Promise<{ items: ErrorLog[]; total: number }> {
    if (USE_MOCK) {
      await delay(400);
      const filtered = mock.mockErrors.filter(e =>
        e.error_message.toLowerCase().includes(query.toLowerCase())
      );
      return { items: filtered, total: filtered.length };
    }
    return fetchAPI(`/errors/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  async getErrorSummary(timeRange: number = 1440): Promise<ErrorSummary> {
    if (USE_MOCK) {
      await delay(300);
      return mock.mockErrorSummary;
    }
    return fetchAPI(`/errors/summary?time_range=${timeRange}`);
  },

  async getErrorTrends(timeRange: number = 1440, bucket: number = 60): Promise<ErrorTrend[]> {
    if (USE_MOCK) {
      await delay(300);
      return mock.mockErrorTrends;
    }
    return fetchAPI(`/errors/trends?time_range=${timeRange}&bucket=${bucket}`);
  },
};

// ============ Healer Service ============
export const healerService = {
  async getHealableFunctions(timeRange: number = 1440): Promise<{ items: HealableFunction[]; total: number }> {
    if (USE_MOCK) {
      await delay(300);
      return { items: mock.mockHealableFunctions, total: mock.mockHealableFunctions.length };
    }
    return fetchAPI(`/healer/functions?time_range=${timeRange}`);
  },

  async diagnose(functionName: string, lookbackMinutes: number = 60): Promise<DiagnosisResult> {
    if (USE_MOCK) {
      await delay(3000);
      return {
        function_name: functionName,
        diagnosis: 'The function is experiencing timeout errors due to slow database queries. Consider adding connection pooling or query optimization.',
        suggested_fix: `// Add connection pooling\nconst pool = createPool({ max: 10, idleTimeoutMillis: 30000 });`,
        lookback_minutes: lookbackMinutes,
        status: 'success',
      };
    }
    return fetchAPI('/healer/diagnose', {
      method: 'POST',
      body: JSON.stringify({
        function_name: functionName,
        lookback_minutes: lookbackMinutes,
      }),
    });
  },

  async batchDiagnose(
    functionNames: string[],
    lookbackMinutes: number = 60
  ): Promise<{ results: DiagnosisResult[]; total: number; succeeded: number; failed: number }> {
    if (USE_MOCK) {
      await delay(5000);
      return {
        results: functionNames.map(name => ({
          function_name: name,
          diagnosis: 'Mock diagnosis result',
          lookback_minutes: lookbackMinutes,
          status: 'success' as const,
        })),
        total: functionNames.length,
        succeeded: functionNames.length,
        failed: 0,
      };
    }
    return fetchAPI('/healer/diagnose/batch', {
      method: 'POST',
      body: JSON.stringify({
        function_names: functionNames,
        lookback_minutes: lookbackMinutes,
      }),
    });
  },
};
