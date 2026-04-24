'use client';
import { useQuery } from '@tanstack/react-query';
import { referralsApi } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';
import { SimpleBarChart } from '@/components/SimpleChart';
import { Share2, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

export default function ReferralsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: referralsApi.getStats,
  });

  const funnelData = data
    ? [
        { stage: 'Distress Detected', count: data.distressDetected },
        { stage: 'Referral Shown', count: data.referralShown },
        { stage: 'Referral Accepted', count: data.referralAccepted },
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
        title="Referrals & Interventions"
        description="Funnel from distress detection through referral acceptance"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Distress Detected"
          value={data?.distressDetected?.toLocaleString() ?? '—'}
          icon={AlertCircle}
          color="red"
        />
        <MetricCard
          label="Referrals Shown"
          value={data?.referralShown?.toLocaleString() ?? '—'}
          icon={Share2}
          color="amber"
        />
        <MetricCard
          label="Referrals Accepted"
          value={data?.referralAccepted?.toLocaleString() ?? '—'}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          label="Acceptance Rate"
          value={data?.shownToAcceptedRate ?? '—'}
          icon={TrendingUp}
          color="violet"
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Referral Funnel</h2>
        <SimpleBarChart
          data={funnelData as Record<string, unknown>[]}
          xKey="stage"
          bars={[{ key: 'count', name: 'Count', color: '#7c3aed' }]}
          height={260}
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Distress → Shown Rate</p>
          <p className="text-lg font-bold text-white">{data?.distressToShownRate ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Shown → Accepted Rate</p>
          <p className="text-lg font-bold text-white">{data?.shownToAcceptedRate ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
