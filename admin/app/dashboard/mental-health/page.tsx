'use client';
import { useQuery } from '@tanstack/react-query';
import { mentalHealthApi } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';
import { SimpleBarChart } from '@/components/SimpleChart';
import { ShieldAlert, Users, AlertTriangle, TrendingDown } from 'lucide-react';

export default function MentalHealthPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['mental-health'],
    queryFn: mentalHealthApi.getStats,
    refetchInterval: 120_000,
  });

  const bucketData = data
    ? [
        { label: 'Minimal', value: data.buckets.minimal },
        { label: 'Mild', value: data.buckets.mild },
        { label: 'Moderate', value: data.buckets.moderate },
        { label: 'Severe', value: data.buckets.severe },
      ]
    : [];

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
        title="Mental Health Signals"
        description="Anonymized sentiment distributions — no personally identifiable information is linked to scores."
      />

      <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl px-4 py-3 mb-6 text-sm text-amber-300 flex items-start gap-2">
        <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
        <span>
          Data is anonymized. Scores represent sentiment baselines — not clinical diagnoses.
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Users"
          value={data?.totalUsers?.toLocaleString() ?? '—'}
          icon={Users}
          color="blue"
        />
        <MetricCard
          label="Distress Users"
          value={data?.distressUsers?.toLocaleString() ?? '—'}
          icon={AlertTriangle}
          color="amber"
        />
        <MetricCard
          label="Distress Rate"
          value={data ? `${data.distressPercent}%` : '—'}
          icon={TrendingDown}
          color="red"
        />
        <MetricCard
          label="Repeated Distress"
          value={data?.repeatedDistress?.toLocaleString() ?? '—'}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">
          Sentiment Distribution (Anonymized Buckets)
        </h2>
        <SimpleBarChart
          data={bucketData as Record<string, unknown>[]}
          xKey="label"
          bars={[{ key: 'value', name: 'Users', color: '#7c3aed' }]}
          height={260}
        />
      </div>
    </div>
  );
}
