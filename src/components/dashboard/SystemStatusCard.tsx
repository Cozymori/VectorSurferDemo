/**
 * System Status Card
 */

'use client';

import { Database, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { SystemStatus } from '@/lib/types/api';

interface SystemStatusCardProps {
  status?: SystemStatus;
}

export function SystemStatusCard({ status }: SystemStatusCardProps) {
  const isConnected = status?.db_connected ?? false;
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-2',
        isConnected
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-red-500/30 bg-red-500/5'
      )}
    >
      <Database className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        {isConnected ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm font-medium">
          {isConnected ? t('status.connected') : t('status.disconnected')}
        </span>
      </div>
    </div>
  );
}
