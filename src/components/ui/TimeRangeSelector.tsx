/**
 * TimeRangeSelector Component
 *
 * 시간 범위 선택기:
 * - 슬라이더로 프리셋 선택
 * - 커스텀 날짜/시간 범위 필터
 * - 전역 상태와 연동 (Zustand)
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Clock,
    Calendar,
    ChevronDown,
    X,
    Check,
} from 'lucide-react';
import { useDashboardStore, TIME_RANGE_PRESETS } from '@/lib/stores/useDashboardStore';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// ============ Main Component ============
export function TimeRangeSelector() {
    const {
        timeRange,
        timeRangeLabel,
        setTimeRangePreset,
        setTimeRangeCustom,
    } = useDashboardStore();
    const { t, language } = useTranslation();

    const [isOpen, setIsOpen] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setShowCustom(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Localized preset labels
    const getPresetLabel = (value: number): string => {
        const presetMap: { [key: number]: string } = {
            15: t('timeRange.presets.15m'),
            30: t('timeRange.presets.30m'),
            60: t('timeRange.presets.1h'),
            180: t('timeRange.presets.3h'),
            360: t('timeRange.presets.6h'),
            720: t('timeRange.presets.12h'),
            1440: t('timeRange.presets.24h'),
            4320: t('timeRange.presets.3d'),
            10080: t('timeRange.presets.7d'),
        };
        return presetMap[value] || `${value}m`;
    };

    // 슬라이더 값 계산
    const sliderIndex = TIME_RANGE_PRESETS.findIndex(p => p.value === timeRange.preset);
    const currentSliderValue = sliderIndex >= 0 ? sliderIndex : 6; // 기본 24시간

    // 슬라이더 변경 핸들러
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const index = parseInt(e.target.value);
        const preset = TIME_RANGE_PRESETS[index];
        if (preset) {
            setTimeRangePreset(preset.value);
        }
    };

    // 프리셋 버튼 클릭 핸들러
    const handlePresetClick = (value: number) => {
        setTimeRangePreset(value);
        setIsOpen(false);
    };

    // 커스텀 범위 적용
    const applyCustomRange = () => {
        if (customStart && customEnd) {
            const start = new Date(customStart);
            const end = new Date(customEnd);
            if (start < end) {
                setTimeRangeCustom(start, end);
                setShowCustom(false);
                setIsOpen(false);
            }
        }
    };

    // 현재 시간 기준으로 기본값 설정
    const setDefaultCustomDates = () => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // datetime-local 형식으로 변환
        const formatForInput = (d: Date) => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        setCustomStart(formatForInput(oneHourAgo));
        setCustomEnd(formatForInput(now));
    };

    // Get display label
    const displayLabel = timeRange.mode === 'preset'
        ? getPresetLabel(timeRange.preset ?? 1440)
        : timeRangeLabel;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* 트리거 버튼 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl border transition-all',
                    'bg-card border-border hover:border-primary/50',
                    isOpen && 'border-primary ring-1 ring-primary/20'
                )}
            >
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                    {displayLabel}
                </span>
                <ChevronDown className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180'
                )} />
            </button>

            {/* 드롭다운 */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-card p-4 shadow-xl z-50">
                    {!showCustom ? (
                        <>
                            {/* 슬라이더 섹션 */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium">{t('timeRange.quickSelect')}</span>
                                    <span className="text-xs text-primary font-semibold">
                                        {getPresetLabel(TIME_RANGE_PRESETS[currentSliderValue]?.value ?? 1440)}
                                    </span>
                                </div>

                                {/* 슬라이더 */}
                                <input
                                    type="range"
                                    min={0}
                                    max={TIME_RANGE_PRESETS.length - 1}
                                    value={currentSliderValue}
                                    onChange={handleSliderChange}
                                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer
                                        [&::-webkit-slider-thumb]:appearance-none
                                        [&::-webkit-slider-thumb]:w-4
                                        [&::-webkit-slider-thumb]:h-4
                                        [&::-webkit-slider-thumb]:rounded-full
                                        [&::-webkit-slider-thumb]:bg-primary
                                        [&::-webkit-slider-thumb]:cursor-pointer
                                        [&::-webkit-slider-thumb]:transition-transform
                                        [&::-webkit-slider-thumb]:hover:scale-110
                                        [&::-moz-range-thumb]:w-4
                                        [&::-moz-range-thumb]:h-4
                                        [&::-moz-range-thumb]:rounded-full
                                        [&::-moz-range-thumb]:bg-primary
                                        [&::-moz-range-thumb]:border-0
                                        [&::-moz-range-thumb]:cursor-pointer"
                                />

                                {/* 슬라이더 라벨 */}
                                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                                    <span>{t('timeRange.presets.15m')}</span>
                                    <span>{t('timeRange.presets.1h')}</span>
                                    <span>{t('timeRange.presets.24h')}</span>
                                    <span>{t('timeRange.presets.7d')}</span>
                                </div>
                            </div>

                            {/* 프리셋 버튼 그리드 */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {TIME_RANGE_PRESETS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        onClick={() => handlePresetClick(preset.value)}
                                        className={cn(
                                            'px-3 py-2 text-xs font-medium rounded-lg transition-all',
                                            timeRange.preset === preset.value && timeRange.mode === 'preset'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {getPresetLabel(preset.value)}
                                    </button>
                                ))}
                            </div>

                            {/* 구분선 */}
                            <div className="border-t border-border my-3" />

                            {/* 커스텀 범위 버튼 */}
                            <button
                                onClick={() => {
                                    setDefaultCustomDates();
                                    setShowCustom(true);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                            >
                                <Calendar className="h-4 w-4" />
                                <span className="text-sm font-medium">{t('timeRange.customRange')}</span>
                            </button>
                        </>
                    ) : (
                        <>
                            {/* 커스텀 범위 입력 */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t('timeRange.customRange')}</span>
                                    <button
                                        onClick={() => setShowCustom(false)}
                                        className="p-1 rounded hover:bg-muted"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* 시작 시간 */}
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1.5">
                                        {t('timeRange.start')}
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
                                    />
                                </div>

                                {/* 종료 시간 */}
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1.5">
                                        {t('timeRange.end')}
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
                                    />
                                </div>

                                {/* 적용 버튼 */}
                                <button
                                    onClick={applyCustomRange}
                                    disabled={!customStart || !customEnd}
                                    className={cn(
                                        'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors',
                                        customStart && customEnd
                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                                    )}
                                >
                                    <Check className="h-4 w-4" />
                                    {t('common.apply')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ============ Fill Mode Selector (전역 상태 연동) ============
export function FillModeSelector() {
    const { fillMode, setFillMode } = useDashboardStore();
    const { t } = useTranslation();

    const modes = [
        { value: 'stroke-only' as const, labelKey: 'chartStyle.line' },
        { value: 'gradient' as const, labelKey: 'chartStyle.gradient' },
        { value: 'solid' as const, labelKey: 'chartStyle.solid' },
    ];

    return (
        <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
            {modes.map(({ value, labelKey }) => (
                <button
                    key={value}
                    onClick={() => setFillMode(value)}
                    className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                        fillMode === value
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    {t(labelKey)}
                </button>
            ))}
        </div>
    );
}

export default TimeRangeSelector;
