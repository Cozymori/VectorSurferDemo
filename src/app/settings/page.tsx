/**
 * Settings Page - Configuration and system status
 */

'use client';

import { useState } from 'react';
import { 
  Settings, 
  Database, 
  RefreshCw, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Palette,
  Server,
  Code2,
  Zap,
  Globe,
  Clock,
  Info,
} from 'lucide-react';
import { useSystemStatus, useFunctions, useTokenUsage } from '@/lib/hooks/useApi';
import { formatNumber, cn } from '@/lib/utils';

// ============ Status Card ============
interface StatusCardProps {
  title: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'loading';
  details?: string;
  action?: React.ReactNode;
}

function StatusCard({ title, icon, status, details, action }: StatusCardProps) {
  return (
    <div className={cn(
      'rounded-2xl border p-5 transition-all',
      status === 'connected' && 'border-green-500/30 bg-green-500/5',
      status === 'disconnected' && 'border-red-500/30 bg-red-500/5',
      status === 'loading' && 'border-border bg-card'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'rounded-xl p-2.5',
            status === 'connected' && 'bg-green-500/10 text-green-500',
            status === 'disconnected' && 'bg-red-500/10 text-red-500',
            status === 'loading' && 'bg-muted text-muted-foreground'
          )}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              {status === 'connected' && (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-sm text-green-500">Connected</span>
                </>
              )}
              {status === 'disconnected' && (
                <>
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-sm text-red-500">Disconnected</span>
                </>
              )}
              {status === 'loading' && (
                <span className="text-sm text-muted-foreground">Checking...</span>
              )}
            </div>
            {details && (
              <p className="text-xs text-muted-foreground mt-1">{details}</p>
            )}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

// ============ Config Item ============
interface ConfigItemProps {
  label: string;
  value: string;
  description?: string;
  editable?: boolean;
  onChange?: (value: string) => void;
}

function ConfigItem({ label, value, description, editable = false, onChange }: ConfigItemProps) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-border last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {editable ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-64 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
      ) : (
        <code className="text-sm bg-muted px-2 py-1 rounded">{value}</code>
      )}
    </div>
  );
}

// ============ Stats Overview ============
function StatsOverview() {
  const { data: functions } = useFunctions();
  const { data: tokens } = useTokenUsage();

  const stats = [
    {
      label: 'Registered Functions',
      value: formatNumber(functions?.total || 0),
      icon: <Code2 className="h-4 w-4" />,
    },
    {
      label: 'Total Tokens Used',
      value: formatNumber(tokens?.total_tokens || 0),
      icon: <Zap className="h-4 w-4" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            {stat.icon}
            <span className="text-xs">{stat.label}</span>
          </div>
          <p className="text-2xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// ============ Quick Links ============
function QuickLinks() {
  const links = [
    {
      title: 'API Documentation',
      description: 'Swagger UI for VectorSurfer API',
      href: 'http://localhost:8000/docs',
      icon: <Server className="h-5 w-5" />,
    },
    {
      title: 'VectorWave SDK',
      description: 'GitHub repository',
      href: 'https://github.com/your-repo/vectorwave',
      icon: <Code2 className="h-5 w-5" />,
    },
    {
      title: 'Weaviate Console',
      description: 'Vector database management',
      href: 'http://localhost:8080',
      icon: <Database className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <a
          key={link.title}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-muted/50 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2 text-muted-foreground group-hover:text-primary transition-colors">
              {link.icon}
            </div>
            <div>
              <p className="font-medium text-sm">{link.title}</p>
              <p className="text-xs text-muted-foreground">{link.description}</p>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </a>
      ))}
    </div>
  );
}

// ============ Main Page Component ============
export default function SettingsPage() {
  const { data: status, refetch, isRefetching } = useSystemStatus();
  const [apiUrl, setApiUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
  );

  const dbStatus = status?.db_connected ? 'connected' : 'disconnected';
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  return (
    <div className="space-y-8 p-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure VectorSurfer dashboard and view system status
        </p>
      </div>

      {/* Connection Status */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          Connection Status
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <StatusCard
            title="Weaviate Database"
            icon={<Database className="h-5 w-5" />}
            status={isRefetching ? 'loading' : dbStatus}
            details={status ? `${status.registered_functions_count} functions registered` : undefined}
            action={
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="rounded-lg border border-border p-2 hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
              </button>
            }
          />
          
          <StatusCard
            title="API Server"
            icon={<Server className="h-5 w-5" />}
            status={status ? 'connected' : 'disconnected'}
            details={apiUrl}
          />
        </div>
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-muted-foreground" />
          Overview
        </h2>
        <StatsOverview />
      </section>

      {/* Configuration */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          Configuration
        </h2>
        
        <div className="rounded-2xl border border-border bg-card">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Configuration is set via environment variables
              </span>
            </div>
          </div>
          
          <div className="px-4">
            <ConfigItem
              label="API Base URL"
              value={apiUrl}
              description="NEXT_PUBLIC_API_URL"
            />
            <ConfigItem
              label="Data Mode"
              value={useMock ? 'Mock Data' : 'Real API'}
              description="NEXT_PUBLIC_USE_MOCK"
            />
            <ConfigItem
              label="Weaviate Host"
              value={process.env.NEXT_PUBLIC_WEAVIATE_HOST || 'localhost:8080'}
              description="NEXT_PUBLIC_WEAVIATE_HOST"
            />
          </div>
        </div>

        {/* Mock Mode Warning */}
        {useMock && (
          <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
            <div className="rounded-lg bg-yellow-500/10 p-2">
              <Info className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-yellow-500">Mock Mode Active</p>
              <p className="text-sm text-muted-foreground mt-1">
                Dashboard is using mock data. Set <code className="bg-muted px-1 rounded">NEXT_PUBLIC_USE_MOCK=false</code> to use real API.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          Quick Links
        </h2>
        <QuickLinks />
      </section>

      {/* About */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Info className="h-5 w-5 text-muted-foreground" />
          About
        </h2>
        
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">VectorSurfer</h3>
              <p className="text-sm text-muted-foreground">
                Vector-based Application Observability
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">2.0.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Framework</p>
              <p className="font-medium">Next.js 15 + React 19</p>
            </div>
            <div>
              <p className="text-muted-foreground">Styling</p>
              <p className="font-medium">Tailwind CSS v4</p>
            </div>
            <div>
              <p className="text-muted-foreground">Backend</p>
              <p className="font-medium">FastAPI + VectorWave</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
        <p>VectorSurfer Dashboard • Built with 💙 for VectorWave SDK</p>
      </div>
    </div>
  );
}
