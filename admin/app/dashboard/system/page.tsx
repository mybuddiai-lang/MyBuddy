'use client';
import { useQuery } from '@tanstack/react-query';
import { systemApi } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';
import { Server, Clock, Zap, AlertTriangle } from 'lucide-react';

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function SystemPage() {
  const { data, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: systemApi.getHealth,
    refetchInterval: 30_000,
  });

  return (
    <div>
      <PageHeader
        title="System Health"
        description="API uptime, DB latency, and error monitoring. Auto-refreshes every 30s."
        action={
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 font-medium transition-colors"
          >
            Refresh
          </button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Status banner */}
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 ${
              data?.status === 'ok'
                ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
                : 'bg-red-950/30 border-red-900/50 text-red-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                data?.status === 'ok' ? 'bg-emerald-400' : 'bg-red-400'
              } animate-pulse`}
            />
            <span className="text-sm font-medium">
              {data?.status === 'ok' ? 'All systems operational' : 'System issues detected'}
            </span>
            {dataUpdatedAt && (
              <span className="text-xs opacity-60 ml-auto">
                Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              label="DB Ping"
              value={data?.dbPingMs !== undefined ? `${data.dbPingMs}ms` : '—'}
              icon={Zap}
              color={data?.dbPingMs !== undefined && data.dbPingMs > 200 ? 'red' : 'green'}
            />
            <MetricCard
              label="Uptime"
              value={data?.uptimeSeconds !== undefined ? formatUptime(data.uptimeSeconds) : '—'}
              icon={Clock}
              color="blue"
            />
            <MetricCard
              label="Errors (1h)"
              value={data?.errorEventsLastHour ?? '—'}
              icon={AlertTriangle}
              color={data?.errorEventsLastHour && data.errorEventsLastHour > 10 ? 'red' : 'amber'}
            />
            <MetricCard
              label="Node.js"
              value={data?.nodeVersion ?? '—'}
              icon={Server}
              color="violet"
            />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Server Info</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">API Status</span>
                <span className="text-emerald-400 font-medium">
                  {data?.status?.toUpperCase() ?? '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Server Timestamp</span>
                <span className="text-zinc-300">{data?.timestamp ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">DB Latency</span>
                <span
                  className={`font-medium ${
                    data?.dbPingMs !== undefined && data.dbPingMs > 200
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {data?.dbPingMs !== undefined ? `${data.dbPingMs}ms` : '—'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
