'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiApi } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';
import { SimpleLineChart } from '@/components/SimpleChart';
import { Bot, Cpu, DollarSign, AlertTriangle } from 'lucide-react';

export default function AiMonitoringPage() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-stats', days],
    queryFn: () => aiApi.getStats(days),
    refetchInterval: 120_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI Monitoring"
        description="Token usage, cost tracking, and failure rates"
        action={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Tokens"
          value={data?.totalTokens?.toLocaleString() ?? '—'}
          icon={Cpu}
          color="violet"
        />
        <MetricCard
          label="AI Messages"
          value={data?.totalMessages?.toLocaleString() ?? '—'}
          icon={Bot}
          color="blue"
        />
        <MetricCard
          label="Est. Cost"
          value={data?.estimatedCostUSD ? `$${data.estimatedCostUSD.toFixed(2)}` : '—'}
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          label="Failure Rate"
          value={data?.failureRate ? `${data.failureRate}%` : '—'}
          icon={AlertTriangle}
          color={parseFloat(data?.failureRate ?? '0') > 1 ? 'red' : 'amber'}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Daily Token Usage</h2>
          <SimpleLineChart
            data={(data?.dailyUsage ?? []) as Record<string, unknown>[]}
            xKey="date"
            lines={[{ key: 'tokens', name: 'Tokens', color: '#7c3aed' }]}
            height={220}
          />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Daily AI Messages</h2>
          <SimpleLineChart
            data={(data?.dailyUsage ?? []) as Record<string, unknown>[]}
            xKey="date"
            lines={[{ key: 'messages', name: 'Messages', color: '#06b6d4' }]}
            height={220}
          />
        </div>
      </div>
    </div>
  );
}
