'use client';

import { useState, useMemo } from 'react';
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
    Filter,
    Search,
    X,
    ChevronDown,
    Square,
    CheckSquare,
    Layers,
} from 'lucide-react';
import { useHealableFunctions, useDiagnose, useBatchDiagnose } from '@/lib/hooks/useApi';
import { useTranslation } from '@/lib/i18n';
import { timeAgo, formatNumber, cn } from '@/lib/utils';
import type { DiagnosisResult, HealableFunction } from '@/lib/types/api';

// ============ Types ============
type DiagnosisMode = 'single' | 'batch';

// ============ Code Block with Copy ============
interface CodeBlockProps {
    code: string;
    language?: string;
}

function CodeBlock({ code, language = 'typescript' }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);
    const { t } = useTranslation();

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
                            {t('healer.copied')}
                        </>
                    ) : (
                        <>
                            <Copy className="h-3 w-3" />
                            {t('healer.copy')}
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

// ============ Diagnosis Result Card (Single) ============
interface DiagnosisCardProps {
    result: DiagnosisResult;
}

function DiagnosisCard({ result }: DiagnosisCardProps) {
    const { t } = useTranslation();
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
                        <h3 className="font-semibold">{t('healer.diagnosisResult')}</h3>
                        <p className="text-xs text-muted-foreground">
                            {result.function_name} • Lookback: {result.lookback_minutes} minutes
                        </p>
                    </div>
                </div>
                <span className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    result.status === 'success' && 'bg-green-500/20 text-green-400',
                    result.status === 'no_errors' && 'bg-blue-500/20 text-blue-400',
                    result.status === 'error' && 'bg-red-500/20 text-red-400'
                )}>
                    {result.status === 'success' ? t('healer.fixSuggested') :
                        result.status === 'no_errors' ? t('healer.noErrors') : t('healer.failed')}
                </span>
            </div>

            {/* Diagnosis */}
            <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {t('healer.analysis')}
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
                        {t('healer.suggestedFix')}
                    </h4>
                    <CodeBlock code={result.suggested_fix} />
                </div>
            )}
        </div>
    );
}

interface BatchResultCardProps {
    results: {
        function_name: string;
        status: string;
        diagnosis: string;      // 기존 diagnosis_preview 대신 전체 내용을 받습니다.
        suggested_fix?: string; // [추가] 수정 제안 코드 필드
    }[];
    succeeded: number;
    failed: number;
    total: number;
}

function BatchResultCard({ results, succeeded, failed, total }: BatchResultCardProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const { t } = useTranslation();

    return (
        <div className="rounded-2xl border border-border bg-card p-6">
            {/* Summary Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-primary" />
                    <div>
                        <h3 className="font-semibold">{t('healer.batchResults')}</h3>
                        <p className="text-xs text-muted-foreground">
                            {total} {t('healer.functionsAnalyzed')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-500 font-medium">{succeeded}</span>
                    </span>
                    <span className="flex items-center gap-1 text-sm">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-500 font-medium">{failed}</span>
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                <div className="h-full flex">
                    <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${(succeeded / total) * 100}%` }}
                    />
                    <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${(failed / total) * 100}%` }}
                    />
                </div>
            </div>

            {/* Results List */}
            <div className="space-y-2 max-h-96 overflow-auto pr-1">
                {results.map((result, index) => (
                    <div
                        key={result.function_name}
                        className={cn(
                            'rounded-xl border p-3 transition-all cursor-pointer',
                            result.status === 'success' && 'border-green-500/30 bg-green-500/5',
                            result.status === 'no_errors' && 'border-blue-500/30 bg-blue-500/5',
                            result.status === 'error' && 'border-red-500/30 bg-red-500/5',
                            expandedIndex === index && 'ring-1 ring-primary'
                        )}
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {result.status === 'success' && <Lightbulb className="h-4 w-4 text-green-500" />}
                                {result.status === 'no_errors' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                                {result.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                                <code className="text-sm font-medium">{result.function_name}</code>
                            </div>
                            <ChevronDown className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform',
                                expandedIndex === index && 'rotate-180'
                            )} />
                        </div>

                        {/* Expanded Full Diagnosis */}
                        {expandedIndex === index && (
                            <div className="mt-3 pt-3 border-t border-border space-y-3">
                                {/* Diagnosis Text: 전체 내용 표시 및 줄바꿈 적용 */}
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {result.diagnosis || "No details available."}
                                </p>

                                {/* [추가] Suggested Fix 코드가 있으면 표시 */}
                                {result.suggested_fix && (
                                    <div className="mt-2">
                                        <div className="flex items-center gap-2 mb-1.5 text-xs font-medium text-primary">
                                            <Code className="h-3 w-3" />
                                            {t('healer.suggestedFix')}
                                        </div>
                                        {/* CodeBlock 컴포넌트 사용 */}
                                        <CodeBlock code={result.suggested_fix} />
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

// ============ Filter Section ============
interface FilterSectionProps {
    functionFilter: string;
    setFunctionFilter: (v: string) => void;
    timeRangeFilter: number;
    setTimeRangeFilter: (v: number) => void;
    errorCodeFilter: string;
    setErrorCodeFilter: (v: string) => void;
    availableErrorCodes: string[];
    onClear: () => void;
    disabled?: boolean;
}

function FilterSection({
    functionFilter,
    setFunctionFilter,
    timeRangeFilter,
    setTimeRangeFilter,
    errorCodeFilter,
    setErrorCodeFilter,
    availableErrorCodes,
    onClear,
    disabled = false,
}: FilterSectionProps) {
    const { t } = useTranslation();
    const hasFilters = functionFilter || errorCodeFilter || timeRangeFilter !== 1440;

    return (
        <div className={cn(
            'rounded-xl border border-border bg-card p-4 space-y-3',
            disabled && 'opacity-50 pointer-events-none'
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('healer.filters')}</span>
                </div>
                {hasFilters && (
                    <button
                        onClick={onClear}
                        disabled={disabled}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
                    >
                        <X className="h-3 w-3" />
                        {t('common.clear')}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3">
                {/* Function Name Filter */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={t('healer.functionName')}
                        value={functionFilter}
                        onChange={(e) => setFunctionFilter(e.target.value)}
                        disabled={disabled}
                        className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-muted"
                    />
                </div>

                {/* Time Range Filter */}
                <select
                    value={timeRangeFilter}
                    onChange={(e) => setTimeRangeFilter(Number(e.target.value))}
                    disabled={disabled}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-muted"
                >
                    <option value={60}>{t('healer.last1h')}</option>
                    <option value={360}>{t('healer.last6h')}</option>
                    <option value={1440}>{t('healer.last24h')}</option>
                    <option value={4320}>{t('healer.last3d')}</option>
                    <option value={10080}>{t('healer.last7d')}</option>
                    <option value={0}>{t('healer.allTime')}</option>
                </select>

                {/* Error Code Filter */}
                <select
                    value={errorCodeFilter}
                    onChange={(e) => setErrorCodeFilter(e.target.value)}
                    disabled={disabled}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-muted"
                >
                    <option value="">{t('healer.allCodes')}</option>
                    {availableErrorCodes.map((code) => (
                        <option key={code} value={code}>{code}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

// ============ [신규] Mode Selector ============
interface ModeSelectorProps {
    mode: DiagnosisMode;
    onModeChange: (mode: DiagnosisMode) => void;
    disabled?: boolean;
}

function ModeSelector({ mode, onModeChange, disabled }: ModeSelectorProps) {
    const { t } = useTranslation();
    return (
        <div className={cn(
            'flex items-center gap-1 rounded-xl bg-muted p-1',
            disabled && 'opacity-50 pointer-events-none'
        )}>
            <button
                onClick={() => onModeChange('single')}
                className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    mode === 'single'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                )}
            >
                <Sparkles className="h-3 w-3" />
                {t('healer.single')}
            </button>
            <button
                onClick={() => onModeChange('batch')}
                className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    mode === 'batch'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                )}
            >
                <Layers className="h-3 w-3" />
                {t('healer.batch')}
            </button>
        </div>
    );
}

// ============ [수정] Function Card with Checkbox ============
interface FunctionCardProps {
    func: HealableFunction;
    isSelected: boolean;
    isChecked?: boolean;
    showCheckbox?: boolean;
    onClick: () => void;
    onCheckChange?: (checked: boolean) => void;
    disabled?: boolean;
}

function FunctionCard({
    func,
    isSelected,
    isChecked = false,
    showCheckbox = false,
    onClick,
    onCheckChange,
    disabled = false
}: FunctionCardProps) {
    const { t } = useTranslation();
    const handleCheckClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCheckChange?.(!isChecked);
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                'w-full text-left rounded-xl border p-4 transition-all cursor-pointer',
                isSelected && !showCheckbox
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border bg-card hover:border-primary/50',
                isChecked && showCheckbox && 'border-primary/50 bg-primary/5',
                disabled && 'opacity-50 cursor-not-allowed hover:border-border'
            )}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {/* [신규] Checkbox for batch mode */}
                    {showCheckbox && (
                        <button
                            onClick={handleCheckClick}
                            disabled={disabled}
                            className="p-0.5 rounded hover:bg-muted transition-colors"
                        >
                            {isChecked ? (
                                <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                                <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                        </button>
                    )}
                    <code className="text-sm font-semibold truncate">{func.function_name}</code>
                </div>
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400 shrink-0">
                    {formatNumber(func.error_count)} {t('healer.errors')}
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
                        +{func.error_codes.length - 3} {t('healer.more')}
                    </span>
                )}
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t('healer.lastError')}: {timeAgo(func.latest_error_time)}
            </p>
        </div>
    );
}

// ============ Function Selector Dropdown (Single Mode) ============
interface FunctionSelectorProps {
    functions: HealableFunction[];
    selectedFunction: string | null;
    onSelect: (functionName: string | null) => void;
    disabled?: boolean;
}

function FunctionSelector({ functions, selectedFunction, onSelect, disabled = false }: FunctionSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedFunc = functions.find(f => f.function_name === selectedFunction);

    return (
        <div className="relative">
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    'w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all',
                    selectedFunction
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-muted hover:border-primary/50',
                    disabled && 'opacity-50 cursor-not-allowed hover:border-border'
                )}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {selectedFunction ? (
                        <>
                            <code className="text-sm font-semibold truncate">{selectedFunction}</code>
                            {selectedFunc && (
                                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400 shrink-0">
                                    {formatNumber(selectedFunc.error_count)} errors
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-sm text-muted-foreground">Select a function to diagnose...</span>
                    )}
                </div>
                <ChevronDown className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180'
                )} />
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-10 top-full left-0 right-0 mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-card shadow-xl">
                    {functions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No functions with errors
                        </div>
                    ) : (
                        functions.map((func) => (
                            <button
                                key={func.function_name}
                                onClick={() => {
                                    onSelect(func.function_name);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    'w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0',
                                    selectedFunction === func.function_name && 'bg-primary/5'
                                )}
                            >
                                <code className="text-sm font-medium truncate">{func.function_name}</code>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                                        {formatNumber(func.error_count)}
                                    </span>
                                    {selectedFunction === func.function_name && (
                                        <Check className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// ============ Loading Overlay ============
interface LoadingOverlayProps {
    mode: DiagnosisMode;
    count?: number;
}

function LoadingOverlay({ mode, count = 1 }: LoadingOverlayProps) {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-2xl">
                <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="text-center">
                    <h3 className="font-semibold text-lg">
                        {mode === 'batch' ? t('healer.batchInProgress') : t('healer.diagnosisInProgress')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {mode === 'batch'
                            ? `${count} ${t('healer.analyzingFunctions')}`
                            : t('healer.analyzingPatterns')}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    {mode === 'batch' ? t('healer.maySeveral') : t('healer.mayTake30')}
                </div>
            </div>
        </div>
    );
}

// ============ Main Page Component ============
export default function HealerPage() {
    // 모드 상태
    const [mode, setMode] = useState<DiagnosisMode>('single');

    // 필터 상태
    const [functionFilter, setFunctionFilter] = useState('');
    const [timeRangeFilter, setTimeRangeFilter] = useState(1440);
    const [errorCodeFilter, setErrorCodeFilter] = useState('');

    // Single 모드 상태
    const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
    const [lookback, setLookback] = useState(60);
    const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);

    // [신규] Batch 모드 상태
    const [checkedFunctions, setCheckedFunctions] = useState<Set<string>>(new Set());
    const [batchResult, setBatchResult] = useState<BatchResultCardProps | null>(null);

    // API 호출
    const { data: functionsData, isLoading } = useHealableFunctions(timeRangeFilter);
    const diagnose = useDiagnose();
    const batchDiagnose = useBatchDiagnose();

    const isRunning = diagnose.isPending || batchDiagnose.isPending;

    // 필터 적용
    const filteredFunctions = useMemo(() => {
        let items = functionsData?.items || [];

        if (functionFilter) {
            items = items.filter(f =>
                f.function_name.toLowerCase().includes(functionFilter.toLowerCase())
            );
        }

        if (errorCodeFilter) {
            items = items.filter(f =>
                f.error_codes.includes(errorCodeFilter)
            );
        }

        return items;
    }, [functionsData, functionFilter, errorCodeFilter]);

    // 에러 코드 목록
    const availableErrorCodes = useMemo(() => {
        const codes = new Set<string>();
        (functionsData?.items || []).forEach(f => {
            f.error_codes.forEach(code => codes.add(code));
        });
        return Array.from(codes).sort();
    }, [functionsData]);

    // 필터 초기화
    const clearFilters = () => {
        setFunctionFilter('');
        setTimeRangeFilter(1440);
        setErrorCodeFilter('');
    };

    // [신규] 체크 토글
    const handleCheckChange = (functionName: string, checked: boolean) => {
        setCheckedFunctions(prev => {
            const next = new Set(prev);
            if (checked) {
                next.add(functionName);
            } else {
                next.delete(functionName);
            }
            return next;
        });
    };

    // [신규] 전체 선택/해제
    const handleSelectAll = () => {
        if (checkedFunctions.size === filteredFunctions.length) {
            setCheckedFunctions(new Set());
        } else {
            setCheckedFunctions(new Set(filteredFunctions.map(f => f.function_name)));
        }
    };

    // Single 진단 실행
    const handleSingleDiagnose = async () => {
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
        if (checkedFunctions.size === 0) return;
        setBatchResult(null);

        try {
            const result = await batchDiagnose.mutateAsync({
                functionNames: Array.from(checkedFunctions),
                lookbackMinutes: lookback,
            });

            // API 응답 매핑 부분
            setBatchResult({
                results: result.results.map(r => ({
                    function_name: r.function_name,
                    status: r.status,
                    diagnosis: r.diagnosis || 'No diagnosis available', // 전체 진단 내용
                    suggested_fix: r.suggested_fix, // 백엔드에서 받은 수정 코드 전달
                })),
                succeeded: result.succeeded,
                failed: result.failed,
                total: result.total,
            });
        } catch (error) {
            console.error('Batch diagnosis failed:', error);
        }
    };

    // 모드 변경 시 상태 초기화
    const handleModeChange = (newMode: DiagnosisMode) => {
        setMode(newMode);
        setDiagnosis(null);
        setBatchResult(null);
        setSelectedFunction(null);
        setCheckedFunctions(new Set());
    };

    return (
        <div className="space-y-6 p-6">
            {/* Loading Overlay */}
            {isRunning && (
                <LoadingOverlay
                    mode={mode}
                    count={mode === 'batch' ? checkedFunctions.size : 1}
                />
            )}

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
                {/* [신규] Mode Selector */}
                <ModeSelector
                    mode={mode}
                    onModeChange={handleModeChange}
                    disabled={isRunning}
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Function List with Filters */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Functions with Errors</h3>
                        <span className="text-xs text-muted-foreground">
                            {filteredFunctions.length} of {functionsData?.total || 0}
                        </span>
                    </div>

                    {/* Filters */}
                    <FilterSection
                        functionFilter={functionFilter}
                        setFunctionFilter={setFunctionFilter}
                        timeRangeFilter={timeRangeFilter}
                        setTimeRangeFilter={setTimeRangeFilter}
                        errorCodeFilter={errorCodeFilter}
                        setErrorCodeFilter={setErrorCodeFilter}
                        availableErrorCodes={availableErrorCodes}
                        onClear={clearFilters}
                        disabled={isRunning}
                    />

                    {/* [신규] Batch 모드: 전체 선택 버튼 */}
                    {mode === 'batch' && filteredFunctions.length > 0 && (
                        <button
                            onClick={handleSelectAll}
                            disabled={isRunning}
                            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                        >
                            {checkedFunctions.size === filteredFunctions.length ? (
                                <>
                                    <Square className="h-4 w-4" />
                                    Deselect All
                                </>
                            ) : (
                                <>
                                    <CheckSquare className="h-4 w-4" />
                                    Select All ({filteredFunctions.length})
                                </>
                            )}
                        </button>
                    )}

                    {/* Function List */}
                    <div className="space-y-2 max-h-[500px] overflow-auto pr-2">
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
                            ))
                        ) : filteredFunctions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <CheckCircle className="h-10 w-10 mb-3 text-green-500 opacity-50" />
                                <p className="text-sm font-medium">No errors found!</p>
                                <p className="text-xs mt-1">
                                    {functionFilter || errorCodeFilter ? 'Try adjusting filters' : 'Everything looks healthy'}
                                </p>
                            </div>
                        ) : (
                            filteredFunctions.map((func) => (
                                <FunctionCard
                                    key={func.function_name}
                                    func={func}
                                    isSelected={selectedFunction === func.function_name}
                                    isChecked={checkedFunctions.has(func.function_name)}
                                    showCheckbox={mode === 'batch'}
                                    onClick={() => {
                                        if (mode === 'single') {
                                            setSelectedFunction(func.function_name);
                                        } else {
                                            handleCheckChange(func.function_name, !checkedFunctions.has(func.function_name));
                                        }
                                    }}
                                    onCheckChange={(checked) => handleCheckChange(func.function_name, checked)}
                                    disabled={isRunning}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Configuration & Results */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Configuration */}
                    <div className={cn(
                        'rounded-2xl border border-border bg-card p-6',
                        isRunning && 'opacity-50 pointer-events-none'
                    )}>
                        <h3 className="font-semibold mb-4">Diagnosis Configuration</h3>

                        <div className="grid gap-4 md:grid-cols-2 mb-6">
                            {/* Single Mode: Function Selector */}
                            {mode === 'single' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Selected Function
                                    </label>
                                    <FunctionSelector
                                        functions={filteredFunctions}
                                        selectedFunction={selectedFunction}
                                        onSelect={setSelectedFunction}
                                        disabled={isRunning}
                                    />
                                </div>
                            )}

                            {/* Batch Mode: Selected Count */}
                            {mode === 'batch' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Selected Functions
                                    </label>
                                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-3">
                                        <Layers className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-medium">
                                            {checkedFunctions.size} functions selected
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Lookback */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Lookback (minutes)</label>
                                <input
                                    type="number"
                                    value={lookback}
                                    onChange={(e) => setLookback(Number(e.target.value))}
                                    min={5}
                                    max={1440}
                                    disabled={isRunning}
                                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-muted"
                                />
                            </div>
                        </div>

                        {/* Run Button */}
                        <button
                            onClick={mode === 'single' ? handleSingleDiagnose : handleBatchDiagnose}
                            disabled={
                                isRunning ||
                                (mode === 'single' && !selectedFunction) ||
                                (mode === 'batch' && checkedFunctions.size === 0)
                            }
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {isRunning ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : mode === 'batch' ? (
                                <Layers className="h-4 w-4" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                            {isRunning
                                ? 'Analyzing...'
                                : mode === 'batch'
                                    ? `Batch Diagnose (${checkedFunctions.size})`
                                    : 'Diagnose & Heal'}
                        </button>
                    </div>

                    {/* Results */}
                    {mode === 'single' && diagnosis && <DiagnosisCard result={diagnosis} />}
                    {mode === 'batch' && batchResult && <BatchResultCard {...batchResult} />}

                    {/* Empty State */}
                    {!diagnosis && !batchResult && !isRunning && (
                        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                            {mode === 'batch' ? (
                                <>
                                    <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                    <h3 className="font-semibold mb-2">Batch Diagnosis</h3>
                                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                        Select multiple functions using checkboxes and click Batch Diagnose
                                        to analyze them all in parallel. Results will show a summary of all diagnoses.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                    <h3 className="font-semibold mb-2">AI-Powered Diagnosis</h3>
                                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                        Select a function with errors and click Diagnose &amp; Heal to get
                                        AI-generated insights and fix suggestions based on recent error patterns.
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}