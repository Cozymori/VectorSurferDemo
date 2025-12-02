/**
 * VectorSurfer API Type Definitions
 */

// ============ Common ============
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ============ Analytics ============
export interface SystemStatus {
  db_connected: boolean;
  registered_functions_count: number;
  last_checked: string;
}

export interface KPIMetrics {
  total_executions: number;
  success_count: number;
  error_count: number;
  cache_hit_count: number;
  success_rate: number;
  avg_duration_ms: number;
  time_range_minutes: number;
}

export interface TokenUsage {
  total_tokens: number;
  by_category: Record<string, number>;
}

export interface TimelineDataPoint {
  timestamp: string;
  success: number;
  error: number;
  cache_hit: number;
}

export interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
}

// ============ Executions ============
export interface Execution {
  span_id: string;
  trace_id: string;
  function_name: string;
  status: 'SUCCESS' | 'ERROR' | 'CACHE_HIT';
  duration_ms: number;
  timestamp_utc: string;
  team?: string;
  error_code?: string;
  error_message?: string;
  input_preview?: string;
  output_preview?: string;
}

export interface ExecutionFilters {
  status?: string;
  function_name?: string;
  team?: string;
  error_code?: string;
  time_range?: number;
}

// ============ Traces ============
export interface TraceListItem {
  trace_id: string;
  root_function: string;
  start_time: string;
  total_duration_ms: number;
  span_count: number;
  status: 'SUCCESS' | 'ERROR' | 'PARTIAL';
}

export interface Span {
    span_id: string;
    parent_span_id?: string;
    function_name: string;
    status: string;
    duration_ms: number;
    start_time: string;
    end_time: string;
    depth: number;
    offset_ms: number;
    children?: Span[];
    error_code?: string;
    error_message?: string;
}

export interface TraceDetail {
  trace_id: string;
  spans: Span[];
  span_count: number;
  total_duration_ms: number;
  start_time: string;
  status: string;
}

export interface TraceAnalysis {
  trace_id: string;
  analysis: string;
  language: string;
}

// ============ Functions ============
export interface FunctionInfo {
  function_name: string;
  module: string;
  team?: string;
  description?: string;
  docstring?: string;
  source_code?: string;
  execution_count?: number;
  avg_duration_ms?: number;
  error_rate?: number;
}

export interface FunctionSearchResult extends FunctionInfo {
  distance?: number;
  score?: number;
}

// ============ Errors ============
export interface ErrorLog {
  span_id: string;
  trace_id: string;
  function_name: string;
  error_code: string;
  error_message: string;
  timestamp_utc: string;
  team?: string;
  traceback?: string;
}

export interface ErrorSummary {
  total_errors: number;
  by_error_code: { error_code: string; count: number }[];
  by_function: { function_name: string; count: number }[];
  by_team: { team: string; count: number }[];
  time_range_minutes: number;
}

export interface ErrorTrend {
  timestamp: string;
  count: number;
  error_codes: Record<string, number>;
}

// ============ Replay ============
export interface ReplayResult {
  function: string;
  total: number;
  passed: number;
  failed: number;
  updated: number;
  mode?: string;
  failures: ReplayFailure[];
}

export interface ReplayFailure {
  input: string;
  expected: string;
  actual: string;
  diff_html?: string;
  similarity?: number;
}

export interface ReplayableFunction {
  function_name: string;
  log_count: number;
  latest_timestamp: string;
}

// ============ Healer ============
export interface HealableFunction {
  function_name: string;
  error_count: number;
  error_codes: string[];
  latest_error_time: string;
}

export interface DiagnosisResult {
  function_name: string;
  diagnosis: string;
  suggested_fix?: string;
  lookback_minutes: number;
  status: 'success' | 'no_errors' | 'error';
}
