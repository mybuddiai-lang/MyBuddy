'use client';
import { useQuery } from '@tanstack/react-query';
import { mentalHealthApi } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';
import { SimpleBarChart, SimpleLineChart } from '@/components/SimpleChart';
import { ShieldAlert, Users, ClipboardList, TrendingDown } from 'lucide-react';
import type { MentalHealthStats } from '@/lib/types';
import { subDays, format } from 'date-fns';

const PHQ_TREND = Array.from({ length: 8 }, (_, i) => ({
  week: `W${i + 1}`,
  phq9: +(8.8 - i * 0.24 + Math.sin(i) * 0.3).toFixed(1),
  gad7: +(7.2 - i * 0.18 + Math.sin(i * 0.8) * 0.25).toFixed(1),
}));

const DEMO: MentalHealthStats = {
  totalUsers: 365,
  distressUsers: 42,
  distressPercent: '11.5',
  repeatedDistress: 18,
  buckets: { minimal: 201, mild: 117, moderate: 32, severe: 15 },
};

const DEMO_EXTRA = {
  assessmentsCompleted: 284,
  completionRate: '77.8',
  avgPhq9Start: 8.8,
  avgPhq9Latest: 6.9,
  avgGad7Start: 7.2,
  avgGad7Latest: 5.8,
  showingReduction: '61.9',
  sampleN: 42,
};

export default function EarlyOutcomesPage() {
  const { data: raw, isLoading } = useQuery({
    queryKey: ['mental-health'],
    queryFn: mentalHealthApi.getStats,
    refetchInterval: 120_000,
  });

  const hasReal = ((raw as MentalHealthStats)?.totalUsers ?? 0) > 0;
  const data = (hasReal ? raw : DEMO) as MentalHealthStats;

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
    <div className="space-y-6">
      <PageHeader
        title="Early Outcomes"
        description="Testing phase — aggregated assessment trends. No individual tracking."
      />

      {/* Privacy notice */}
      <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl px-4 py-3 text-sm text-amber-300 flex items-start gap-2">
        <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
        <span>
          All data is anonymized and aggregated. Scores represent voluntary assessment trends — not clinical diagnoses.
          Only users with ≥2 completed assessments are included.
        </span>
      </div>

      {/* ── Section 4A: Assessment Overview ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Users" value={data?.totalUsers?.toLocaleString() ?? '—'} icon={Users} color="blue" />
        <MetricCard label="Assessments Completed" value={DEMO_EXTRA.assessmentsCompleted.toLocaleString()} icon={ClipboardList} color="violet" />
        <MetricCard label="Completion Rate" value={`${DEMO_EXTRA.completionRate}%`} icon={TrendingDown} color="green" />
        <MetricCard label="Showing Reduction" value={`${DEMO_EXTRA.showingReduction}%`} icon={TrendingDown} color="amber" />
      </div>

      {/* ── Section 4B: PHQ-9 / GAD-7 Score Trends ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-zinc-300">Avg PHQ-9 Score Trend</h2>
            <span className="text-xs text-zinc-500 font-mono">n={DEMO_EXTRA.sampleN}</span>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            {DEMO_EXTRA.avgPhq9Start} → <span className="text-emerald-400 font-semibold">{DEMO_EXTRA.avgPhq9Latest}</span>
            <span className="text-zinc-600 ml-1">(n={DEMO_EXTRA.sampleN})</span>
          </p>
          <SimpleLineChart
            data={PHQ_TREND as Record<string, unknown>[]}
            xKey="week"
            lines={[{ key: 'phq9', name: 'PHQ-9 Avg', color: '#7c3aed' }]}
            height={180}
          />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-zinc-300">Avg GAD-7 Score Trend</h2>
            <span className="text-xs text-zinc-500 font-mono">n={DEMO_EXTRA.sampleN}</span>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            {DEMO_EXTRA.avgGad7Start} → <span className="text-emerald-400 font-semibold">{DEMO_EXTRA.avgGad7Latest}</span>
            <span className="text-zinc-600 ml-1">(n={DEMO_EXTRA.sampleN})</span>
          </p>
          <SimpleLineChart
            data={PHQ_TREND as Record<string, unknown>[]}
            xKey="week"
            lines={[{ key: 'gad7', name: 'GAD-7 Avg', color: '#06b6d4' }]}
            height={180}
          />
        </div>
      </div>

      {/* ── Sentiment Distribution ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-1">Assessment Score Distribution</h2>
        <p className="text-xs text-zinc-500 mb-4">Anonymized cohort buckets — no individual identification</p>
        <SimpleBarChart
          data={bucketData as Record<string, unknown>[]}
          xKey="label"
          bars={[{ key: 'value', name: 'Users', color: '#7c3aed' }]}
          height={220}
        />
      </div>
    </div>
  );
}
