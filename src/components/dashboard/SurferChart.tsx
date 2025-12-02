/**
 * SurferChart Component
 * 
 * Wave-style area chart with a surfer icon riding the last data point.
 * Supports three fill modes: stroke-only, gradient, solid
 * 
 * Theme: Sunset Surfing (#ec5a53 Coral accent)
 */

'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ============ Types ============
export type FillMode = 'stroke-only' | 'gradient' | 'solid';

export interface SurferChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface SurferChartProps {
  data: SurferChartDataPoint[];
  dataKey?: string;
  fillMode?: FillMode;
  strokeColor?: string;
  fillColor?: string;
  height?: number;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
}

// ============ Default Colors (Sunset Theme) ============
const SUNSET_CORAL = '#ec5a53';
const SUNSET_CORAL_LIGHT = '#ff7b74';

// ============ Surfer Icon SVG ============
const SurferIcon = ({ x, y, size = 32 }: { x: number; y: number; size?: number }) => {
  const offsetY = -size - 4;
  
  return (
    <g transform={`translate(${x - size / 2}, ${y + offsetY})`}>
      {/* Glow effect */}
      <defs>
        <filter id="surferGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Surfboard */}
      <ellipse
        cx={size / 2}
        cy={size - 4}
        rx={size / 2.2}
        ry={4}
        fill={SUNSET_CORAL}
        stroke={SUNSET_CORAL_LIGHT}
        strokeWidth={1}
        filter="url(#surferGlow)"
      />
      {/* Surfboard stripe */}
      <line
        x1={size / 2 - 8}
        y1={size - 4}
        x2={size / 2 + 8}
        y2={size - 4}
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.8}
      />
      
      {/* Surfer body */}
      <g transform={`translate(${size / 2}, ${size / 2 - 2})`}>
        {/* Head */}
        <circle 
          cx={0} 
          cy={-8} 
          r={5} 
          fill="#ffffff" 
          stroke={SUNSET_CORAL} 
          strokeWidth={1} 
        />
        
        {/* Body */}
        <path
          d="M0 -3 Q-3 4 -2 10 L2 10 Q3 4 0 -3"
          fill={SUNSET_CORAL}
          stroke={SUNSET_CORAL_LIGHT}
          strokeWidth={1}
        />
        
        {/* Left arm */}
        <path
          d="M-2 0 Q-8 -6 -10 -2"
          fill="none"
          stroke="#ffffff"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        
        {/* Right arm */}
        <path
          d="M2 0 Q8 -8 12 -4"
          fill="none"
          stroke="#ffffff"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        
        {/* Legs */}
        <path
          d="M-1 10 L-3 16"
          fill="none"
          stroke={SUNSET_CORAL}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path
          d="M1 10 L4 15"
          fill="none"
          stroke={SUNSET_CORAL}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </g>
      
      {/* Water splash effect */}
      <g opacity={0.7}>
        <circle cx={size / 2 - 12} cy={size - 2} r={2} fill={SUNSET_CORAL_LIGHT} />
        <circle cx={size / 2 + 14} cy={size - 1} r={1.5} fill={SUNSET_CORAL_LIGHT} />
        <circle cx={size / 2 - 8} cy={size + 2} r={1} fill={SUNSET_CORAL} />
      </g>
    </g>
  );
};

// ============ Custom Dot ============
interface CustomDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  dataLength: number;
  payload?: SurferChartDataPoint;
}

const CustomDot = ({ cx, cy, index, dataLength }: CustomDotProps) => {
  if (index !== dataLength - 1 || cx === undefined || cy === undefined) {
    return null;
  }
  
  return <SurferIcon x={cx} y={cy} size={36} />;
};

// ============ Main Component ============
export function SurferChart({
  data,
  dataKey = 'value',
  fillMode = 'gradient',
  strokeColor = SUNSET_CORAL,
  fillColor = SUNSET_CORAL,
  height = 300,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  showTooltip = true,
  animated = true,
}: SurferChartProps) {
  
  const gradientId = useMemo(() => `surferGradient-${Math.random().toString(36).substr(2, 9)}`, []);
  
  const getFill = () => {
    switch (fillMode) {
      case 'stroke-only':
        return 'transparent';
      case 'gradient':
        return `url(#${gradientId})`;
      case 'solid':
        return fillColor;
      default:
        return `url(#${gradientId})`;
    }
  };
  
  const getFillOpacity = () => {
    switch (fillMode) {
      case 'stroke-only':
        return 0;
      case 'gradient':
        return 1;
      case 'solid':
        return 0.6;
      default:
        return 1;
    }
  };

  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 50, right: 20, left: 0, bottom: 0 }}
        >
          {/* Gradient Definition - Sunset Theme */}
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity={0.5} />
              <stop offset="50%" stopColor={fillColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          {/* Grid */}
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#3a3a3a"
              opacity={0.5} 
              vertical={false}
            />
          )}
          
          {/* Axes */}
          {showXAxis && (
            <XAxis
              dataKey="name"
              tick={{ fill: '#888', fontSize: 12 }}
              axisLine={{ stroke: '#3a3a3a' }}
              tickLine={{ stroke: '#3a3a3a' }}
            />
          )}
          
          {showYAxis && (
            <YAxis
              tick={{ fill: '#888', fontSize: 12 }}
              axisLine={{ stroke: '#3a3a3a' }}
              tickLine={{ stroke: '#3a3a3a' }}
              width={40}
            />
          )}
          
          {/* Tooltip */}
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: '#2e2e2e',
                border: '1px solid #3a3a3a',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
              }}
              labelStyle={{ color: '#ffffff' }}
              itemStyle={{ color: SUNSET_CORAL }}
            />
          )}
          
          {/* Area (Wave) */}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={strokeColor}
            strokeWidth={3}
            fill={getFill()}
            fillOpacity={getFillOpacity()}
            isAnimationActive={animated}
            animationDuration={1000}
            animationEasing="ease-out"
            dot={(props) => (
              <CustomDot 
                {...props} 
                dataLength={data.length} 
              />
            )}
            activeDot={{
              r: 6,
              fill: strokeColor,
              stroke: '#1e1e1e',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============ Fill Mode Selector ============
interface FillModeSelectorProps {
  value: FillMode;
  onChange: (mode: FillMode) => void;
}

export function FillModeSelector({ value, onChange }: FillModeSelectorProps) {
  const modes: { mode: FillMode; label: string }[] = [
    { mode: 'stroke-only', label: 'Line Only' },
    { mode: 'gradient', label: 'Gradient' },
    { mode: 'solid', label: 'Solid' },
  ];

  return (
    <div className="flex items-center gap-1 rounded-xl bg-[#2e2e2e] p-1">
      {modes.map(({ mode, label }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value === mode
              ? 'bg-[#ec5a53] text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default SurferChart;
