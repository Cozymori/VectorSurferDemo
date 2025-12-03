/**
 * Mock Data for Development
 */

import type {
  SystemStatus,
  KPIMetrics,
  TokenUsage,
  TimelineDataPoint,
  DistributionItem,
  Execution,
  TraceListItem,
  TraceDetail,
  FunctionInfo,
  ErrorLog,
  ErrorSummary,
  ErrorTrend,
  HealableFunction,
} from '../types/api';

// ============ Analytics ============
export const mockSystemStatus: SystemStatus = {
  db_connected: true,
  registered_functions_count: 42,
  last_checked: new Date().toISOString(),
};

export const mockKPIMetrics: KPIMetrics = {
  total_executions: 15847,
  success_count: 14234,
  error_count: 892,
  cache_hit_count: 721,
  success_rate: 89.8,
  avg_duration_ms: 245.6,
  time_range_minutes: 60,
};

export const mockTokenUsage: TokenUsage = {
  total_tokens: 2847561,
  by_category: {
    'chat-completion': 1523400,
    'embedding': 892100,
    'function-calling': 432061,
  },
};

export const mockTimeline: TimelineDataPoint[] = Array.from({ length: 12 }, (_, i) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - (11 - i) * 5);
  return {
    timestamp: date.toISOString(),
    success: Math.floor(Math.random() * 100) + 50,
    error: Math.floor(Math.random() * 15),
    cache_hit: Math.floor(Math.random() * 30),
  };
});

export const mockFunctionDistribution: DistributionItem[] = [
  { name: 'process_payment', count: 3421, percentage: 21.6 },
  { name: 'validate_user', count: 2856, percentage: 18.0 },
  { name: 'fetch_inventory', count: 2134, percentage: 13.5 },
  { name: 'send_notification', count: 1876, percentage: 11.8 },
  { name: 'calculate_shipping', count: 1543, percentage: 9.7 },
  { name: 'Others', count: 4017, percentage: 25.4 },
];

export const mockErrorDistribution: DistributionItem[] = [
  { name: 'TIMEOUT', count: 234, percentage: 26.2 },
  { name: 'VALIDATION_ERROR', count: 198, percentage: 22.2 },
  { name: 'DB_CONNECTION', count: 156, percentage: 17.5 },
  { name: 'AUTH_FAILED', count: 134, percentage: 15.0 },
  { name: 'RATE_LIMIT', count: 98, percentage: 11.0 },
  { name: 'Others', count: 72, percentage: 8.1 },
];

// ============ Executions ============
export const mockExecutions: Execution[] = [
  {
    span_id: 'span-001',
    trace_id: 'trace-abc-123',
    function_name: 'process_payment',
    status: 'SUCCESS',
    duration_ms: 234.5,
    timestamp_utc: new Date(Date.now() - 60000).toISOString(),
    team: 'payments',
    input_preview: '{"amount": 99.99, "currency": "USD"}',
    output_preview: '{"status": "completed", "tx_id": "tx-789"}',
  },
  {
    span_id: 'span-002',
    trace_id: 'trace-abc-124',
    function_name: 'validate_user',
    status: 'ERROR',
    duration_ms: 45.2,
    timestamp_utc: new Date(Date.now() - 120000).toISOString(),
    team: 'auth',
    error_code: 'VALIDATION_ERROR',
    error_message: 'Invalid email format',
  },
  {
    span_id: 'span-003',
    trace_id: 'trace-abc-125',
    function_name: 'fetch_inventory',
    status: 'CACHE_HIT',
    duration_ms: 12.3,
    timestamp_utc: new Date(Date.now() - 180000).toISOString(),
    team: 'inventory',
    input_preview: '{"product_id": "SKU-123"}',
    output_preview: '{"quantity": 42, "cached": true}',
  },
  {
    span_id: 'span-004',
    trace_id: 'trace-abc-126',
    function_name: 'send_notification',
    status: 'SUCCESS',
    duration_ms: 567.8,
    timestamp_utc: new Date(Date.now() - 240000).toISOString(),
    team: 'notifications',
  },
  {
    span_id: 'span-005',
    trace_id: 'trace-abc-127',
    function_name: 'calculate_shipping',
    status: 'ERROR',
    duration_ms: 89.1,
    timestamp_utc: new Date(Date.now() - 300000).toISOString(),
    team: 'logistics',
    error_code: 'TIMEOUT',
    error_message: 'External API timeout',
  },
];

// ============ Traces ============
export const mockTraceList: TraceListItem[] = [
  {
    trace_id: 'trace-abc-123',
    root_function: 'handle_checkout',
    start_time: new Date(Date.now() - 60000).toISOString(),
    total_duration_ms: 1234.5,
    span_count: 8,
    status: 'SUCCESS',
  },
  {
    trace_id: 'trace-abc-124',
    root_function: 'user_login',
    start_time: new Date(Date.now() - 120000).toISOString(),
    total_duration_ms: 456.7,
    span_count: 4,
    status: 'ERROR',
  },
  {
    trace_id: 'trace-abc-125',
    root_function: 'search_products',
    start_time: new Date(Date.now() - 180000).toISOString(),
    total_duration_ms: 789.2,
    span_count: 6,
    status: 'SUCCESS',
  },
];

export const mockTraceDetail: TraceDetail = {
  trace_id: 'trace-abc-123',
  span_count: 4,
  total_duration_ms: 1234.5,
  start_time: new Date(Date.now() - 60000).toISOString(),
  status: 'SUCCESS',
  spans: [
    {
      span_id: 'span-root',
      function_name: 'handle_checkout',
      status: 'SUCCESS',
      duration_ms: 1234.5,
      start_time: new Date(Date.now() - 60000).toISOString(),
      end_time: new Date(Date.now() - 58766).toISOString(),
      depth: 0,
      offset_ms: 0,
    },
    {
      span_id: 'span-child-1',
      parent_span_id: 'span-root',
      function_name: 'validate_cart',
      status: 'SUCCESS',
      duration_ms: 123.4,
      start_time: new Date(Date.now() - 59900).toISOString(),
      end_time: new Date(Date.now() - 59777).toISOString(),
      depth: 1,
      offset_ms: 100,
    },
    {
      span_id: 'span-child-2',
      parent_span_id: 'span-root',
      function_name: 'process_payment',
      status: 'SUCCESS',
      duration_ms: 567.8,
      start_time: new Date(Date.now() - 59700).toISOString(),
      end_time: new Date(Date.now() - 59132).toISOString(),
      depth: 1,
      offset_ms: 300,
    },
    {
      span_id: 'span-child-3',
      parent_span_id: 'span-root',
      function_name: 'send_confirmation',
      status: 'SUCCESS',
      duration_ms: 234.5,
      start_time: new Date(Date.now() - 59000).toISOString(),
      end_time: new Date(Date.now() - 58766).toISOString(),
      depth: 1,
      offset_ms: 1000,
    },
  ],
};

// ============ Functions ============
export const mockFunctions: FunctionInfo[] = [
  {
    function_name: 'process_payment',
    module: 'payments.processor',
    team: 'payments',
    description: 'Processes payment transactions',
    execution_count: 3421,
    avg_duration_ms: 234.5,
    error_rate: 2.1,
  },
  {
    function_name: 'validate_user',
    module: 'auth.validator',
    team: 'auth',
    description: 'Validates user credentials and permissions',
    execution_count: 2856,
    avg_duration_ms: 45.2,
    error_rate: 5.3,
  },
  {
    function_name: 'fetch_inventory',
    module: 'inventory.fetcher',
    team: 'inventory',
    description: 'Fetches current inventory levels',
    execution_count: 2134,
    avg_duration_ms: 89.7,
    error_rate: 1.2,
  },
  {
    function_name: 'send_notification',
    module: 'notifications.sender',
    team: 'notifications',
    description: 'Sends push/email notifications',
    execution_count: 1876,
    avg_duration_ms: 567.8,
    error_rate: 3.4,
  },
];

// ============ Errors ============
export const mockErrors: ErrorLog[] = [
  {
    span_id: 'span-err-001',
    trace_id: 'trace-err-001',
    function_name: 'process_payment',
    error_code: 'TIMEOUT',
    error_message: 'Payment gateway timeout after 30s',
    timestamp_utc: new Date(Date.now() - 300000).toISOString(),
    team: 'payments',
  },
  {
    span_id: 'span-err-002',
    trace_id: 'trace-err-002',
    function_name: 'validate_user',
    error_code: 'VALIDATION_ERROR',
    error_message: 'Invalid email format: user@',
    timestamp_utc: new Date(Date.now() - 600000).toISOString(),
    team: 'auth',
  },
  {
    span_id: 'span-err-003',
    trace_id: 'trace-err-003',
    function_name: 'fetch_inventory',
    error_code: 'DB_CONNECTION',
    error_message: 'Connection pool exhausted',
    timestamp_utc: new Date(Date.now() - 900000).toISOString(),
    team: 'inventory',
  },
];

export const mockErrorSummary: ErrorSummary = {
  total_errors: 892,
  by_error_code: [
    { error_code: 'TIMEOUT', count: 234 },
    { error_code: 'VALIDATION_ERROR', count: 198 },
    { error_code: 'DB_CONNECTION', count: 156 },
    { error_code: 'AUTH_FAILED', count: 134 },
    { error_code: 'RATE_LIMIT', count: 98 },
  ],
  by_function: [
    { function_name: 'process_payment', count: 187 },
    { function_name: 'validate_user', count: 156 },
    { function_name: 'fetch_inventory', count: 134 },
  ],
  by_team: [
    { team: 'payments', count: 234 },
    { team: 'auth', count: 198 },
    { team: 'inventory', count: 156 },
  ],
  time_range_minutes: 1440,
};

export const mockErrorTrends: ErrorTrend[] = Array.from({ length: 24 }, (_, i) => {
  const date = new Date();
  date.setHours(date.getHours() - (23 - i));
  return {
    timestamp: date.toISOString(),
    count: Math.floor(Math.random() * 50) + 10,
    error_codes: {
      TIMEOUT: Math.floor(Math.random() * 15),
      VALIDATION_ERROR: Math.floor(Math.random() * 12),
      DB_CONNECTION: Math.floor(Math.random() * 10),
    },
  };
});

// ============ Healer ============
export const mockHealableFunctions: HealableFunction[] = [
  {
    function_name: 'process_payment',
    error_count: 23,
    error_codes: ['TIMEOUT', 'VALIDATION_ERROR'],
    latest_error_time: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    function_name: 'fetch_inventory',
    error_count: 15,
    error_codes: ['DB_CONNECTION'],
    latest_error_time: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    function_name: 'send_notification',
    error_count: 8,
    error_codes: ['RATE_LIMIT'],
    latest_error_time: new Date(Date.now() - 5400000).toISOString(),
  },
];
