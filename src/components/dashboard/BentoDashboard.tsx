/**
 * BentoDashboard Component
 * 
 * Interactive Bento Grid layout with drag & drop, resize functionality.
 * Uses react-grid-layout for the grid system.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import {
  Activity,
  Zap,
  AlertTriangle,
  Clock,
  PieChart,
  Coins,
  TrendingUp,
  GitBranch,
  Sparkles,
  GripVertical,
  Maximize2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

// Import CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';

// ============ Types ============
export interface WidgetConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface BentoDashboardProps {
  widgets: WidgetConfig[];
  initialLayout?: Layout[];
  columns?: number;
  rowHeight?: number;
  gap?: number;
  onLayoutChange?: (layout: Layout[]) => void;
  editable?: boolean;
}

// ============ Widget Card Component ============
interface WidgetCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  editable?: boolean;
  isHidden?: boolean;
  onToggleHide?: () => void;
}

function WidgetCard({ title, icon, children, editable = true, isHidden = false, onToggleHide }: WidgetCardProps) {
  return (
    <div className={cn(
      "h-full w-full rounded-3xl border border-border bg-card shadow-lg overflow-hidden flex flex-col transition-all hover:shadow-xl",
      editable && "ring-2 ring-primary/20",
      isHidden && "opacity-40"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-primary shrink-0">{icon}</span>
          <h3 className="font-semibold text-sm truncate">{title}</h3>
        </div>

        {editable && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Drag Handle */}
            <div className="drag-handle cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-muted transition-colors">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Hide/Show Toggle Button */}
            {onToggleHide && (
              <button
                onClick={onToggleHide}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isHidden
                    ? "hover:bg-primary/10 hover:text-primary"
                    : "hover:bg-muted"
                )}
                title={isHidden ? 'Show' : 'Hide'}
              >
                {isHidden ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto min-h-0">
        {children}
      </div>
    </div>
  );
}

// ============ Main Component ============
export function BentoDashboard({
  widgets,
  initialLayout,
  columns = 12,
  rowHeight = 80,
  gap = 16,
  onLayoutChange,
  editable = true,
}: BentoDashboardProps) {

  // Generate default layout if not provided
  const defaultLayout: Layout[] = useMemo(() => {
    if (initialLayout) return initialLayout;

    // Auto-generate layout based on widget index
    return widgets.map((widget, index) => ({
      i: widget.id,
      x: (index % 3) * 4,
      y: Math.floor(index / 3) * 3,
      w: widget.minW || 4,
      h: widget.minH || 3,
      minW: widget.minW || 2,
      minH: widget.minH || 2,
      maxW: widget.maxW,
      maxH: widget.maxH,
    }));
  }, [widgets, initialLayout]);

  const [layout, setLayout] = useState<Layout[]>(defaultLayout);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(new Set());

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
    onLayoutChange?.(newLayout);
  }, [onLayoutChange]);

  // Handle widget hide toggle
  const handleToggleHide = useCallback((widgetId: string) => {
    setHiddenWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(widgetId)) {
        newSet.delete(widgetId);
      } else {
        newSet.add(widgetId);
      }
      return newSet;
    });
  }, []);

  // Measure container width
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(node);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // In edit mode, show all widgets. In view mode, hide hidden widgets.
  const visibleWidgets = editable
    ? widgets
    : widgets.filter(widget => !hiddenWidgets.has(widget.id));

  // In edit mode, use full layout. In view mode, filter hidden widgets.
  const visibleLayout = editable
    ? layout
    : layout.filter(item => !hiddenWidgets.has(item.i));

  return (
    <div ref={containerRef} className="w-full bento-dashboard">
      <GridLayout
        className="layout"
        layout={visibleLayout}
        cols={columns}
        rowHeight={rowHeight}
        width={containerWidth}
        margin={[gap, gap]}
        containerPadding={[0, 0]}
        onLayoutChange={handleLayoutChange}
        isDraggable={editable}
        isResizable={editable}
        draggableHandle=".drag-handle"
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
      >
        {visibleWidgets.map((widget) => (
          <div key={widget.id}>
            <WidgetCard
              title={widget.title}
              icon={widget.icon}
              editable={editable}
              isHidden={hiddenWidgets.has(widget.id)}
              onToggleHide={editable ? () => handleToggleHide(widget.id) : undefined}
            >
              {widget.component}
            </WidgetCard>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}

// ============ Preset Layouts ============
export const presetLayouts = {
  // Default overview layout
  overview: [
    { i: 'kpi-executions', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'kpi-success', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'kpi-duration', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'kpi-errors', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'timeline', x: 0, y: 2, w: 8, h: 4, minW: 4, minH: 3 },
    { i: 'distribution', x: 8, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'recent-errors', x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'token-usage', x: 6, y: 6, w: 6, h: 4, minW: 3, minH: 3 },
  ],

  // Compact layout for smaller screens
  compact: [
    { i: 'kpi-executions', x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
    { i: 'kpi-success', x: 6, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
    { i: 'timeline', x: 0, y: 2, w: 12, h: 4, minW: 6, minH: 3 },
    { i: 'distribution', x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'recent-errors', x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
  ],

  // Analytics focused
  analytics: [
    { i: 'timeline', x: 0, y: 0, w: 12, h: 4, minW: 6, minH: 3 },
    { i: 'distribution', x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'error-distribution', x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'token-usage', x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'slowest', x: 0, y: 8, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'recent-errors', x: 6, y: 8, w: 6, h: 4, minW: 4, minH: 3 },
  ],
};

// ============ Layout Selector Component ============
interface LayoutSelectorProps {
  currentLayout: string;
  onSelect: (layoutName: string) => void;
}

export function LayoutSelector({ currentLayout, onSelect }: LayoutSelectorProps) {
  const { t } = useTranslation();

  const layouts = [
    { name: 'overview', labelKey: 'layout.overview' },
    { name: 'compact', labelKey: 'layout.compact' },
    { name: 'analytics', labelKey: 'layout.analytics' },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {layouts.map(({ name, labelKey }) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            currentLayout === name
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}

// ============ Edit Mode Toggle ============
interface EditModeToggleProps {
  isEditing: boolean;
  onToggle: () => void;
}

export function EditModeToggle({ isEditing, onToggle }: EditModeToggleProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        isEditing
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:text-foreground'
      )}
    >
      <Maximize2 className="h-4 w-4" />
      {isEditing ? t('layout.doneEditing') : t('layout.editLayout')}
    </button>
  );
}

export default BentoDashboard;
