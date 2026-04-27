'use client';
import { useQuery } from '@tanstack/react-query';
import { referralsApi } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';
import { SimpleBarChart } from '@/components/SimpleChart';
import { ShieldHalf, MousePointerClick, HeartHandshake, TrendingUp, Users, Phone } from 'lucide-react';

// Safety metrics (Section 5) — abstracted language, no "distress" labels
const DEMO_SAFETY = {
  signalsTriggered: 47,
  suggestionsShown: 38,
  resourcesAccessed: 29,
  signalsToSuggestionsRate: '80.9%',
  suggestionsToResourcesRate: '76.3%',
};

// Professional referrals (Section 6)
const DEMO_REFERRALS = {
  referralsShown: 124,
  referralsClicked: 67,
  contactInitiated: 31,
  clickRate: '54.0%',
  contactRate: '46.3%',
};

export default function SafetyReferralsPage() {
  const { data: raw, isLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: referralsApi.getStats,
  });

  const hasReal = ((raw as Record<string, number>)?.distressDetected ?? 0) > 0;

  // Map backend field names to new abstracted labels
  const safety = hasReal
    ? {
        signalsTriggered: (raw as Record<string, number>).distressDetected,
        suggestionsShown: (raw as Record<string, number>).referralShown,
        resourcesAccessed: (raw as Record<string, number>).referralAccepted,
        signalsToSuggestionsRate: (raw as Record<string, string>).distressToShownRate,
        suggestionsToResourcesRate: (raw as Record<string, string>).shownToAcceptedRate,
      }
    : DEMO_SAFETY;

  const referrals = DEMO_REFERRALS;

  const safetyFunnel = [
    { stage: 'Support Signals', count: safety.signalsTriggered },
    { stage: 'Suggestions Shown', count: safety.suggestionsShown },
    { stage: 'Resources Accessed', count: safety.resourcesAccessed },
  ];

  const referralFunnel = [
    { stage: 'Referrals Shown', count: referrals.referralsShown },
    { stage: 'Referrals Clicked', count: referrals.referralsClicked },
    { stage: 'Contact Initiated', count: referrals.contactInitiated },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Section 5: Safety (Abstracted) ── */}
      <section>
        <PageHeader
          title="Safety & Referrals"
          description="Aggregated safety signals and professional referral funnel. Fully automated — no individual monitoring."
        />

        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3 mt-2">Safety Signals</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Support Signals Triggered" value={safety.signalsTriggered?.toLocaleString() ?? '—'} icon={ShieldHalf} color="amber" />
          <MetricCard label="Support Suggestions Shown" value={safety.suggestionsShown?.toLocaleString() ?? '—'} icon={Users} color="blue" />
          <MetricCard label="Support Resources Accessed" value={safety.resourcesAccessed?.toLocaleString() ?? '—'} icon={HeartHandshake} color="green" />
          <MetricCard label="Resources Rate" value={safety.suggestionsToResourcesRate ?? '—'} icon={TrendingUp} color="violet" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Safety Funnel</h2>
            <SimpleBarChart
              data={safetyFunnel as Record<string, unknown>[]}
              xKey="stage"
              bars={[{ key: 'count', name: 'Count', color: '#7c3aed' }]}
              height={220}
            />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300">Signal Rates</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-xs text-zinc-500 mb-1">Signals → Suggestions Rate</p>
                <p className="text-2xl font-bold text-white">{safety.signalsToSuggestionsRate}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-xs text-zinc-500 mb-1">Suggestions → Resources Rate</p>
                <p className="text-2xl font-bold text-white">{safety.suggestionsToResourcesRate}</p>
              </div>
            </div>
            <p className="text-xs text-zinc-600 pt-2 border-t border-zinc-800">
              All interventions are automated. No admin action required.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 6: Professional Referrals ── */}
      <section>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">Professional Referrals</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <MetricCard label="Referrals Shown" value={referrals.referralsShown.toLocaleString()} icon={Users} color="blue" />
          <MetricCard label="Referrals Clicked" value={referrals.referralsClicked.toLocaleString()} icon={MousePointerClick} color="violet" />
          <MetricCard label="Contact Initiated" value={referrals.contactInitiated.toLocaleString()} icon={Phone} color="green" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-1">Professional Referral Funnel</h2>
          <p className="text-xs text-zinc-500 mb-4">No ranking of professionals · No behavioral profiling</p>
          <SimpleBarChart
            data={referralFunnel as Record<string, unknown>[]}
            xKey="stage"
            bars={[{ key: 'count', name: 'Count', color: '#06b6d4' }]}
            height={200}
          />
        </div>
      </section>
    </div>
  );
}
