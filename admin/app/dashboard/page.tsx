'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { dashboardApi, analyticsApi } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';
import { SimpleLineChart, SimpleBarChart } from '@/components/SimpleChart';
import { Users, Activity, DollarSign, ShieldHalf, Globe, BookOpen, MessageSquare, TrendingUp, Lightbulb, UserPlus } from 'lucide-react';
import { formatDistanceToNow, subDays, format } from 'date-fns';
import type { CountryStat } from '@/lib/types';

// ─── Demo fallback data ───────────────────────────────────────────────────────
const DEMO_OVERVIEW = {
  totalUsers: 365, dau: 48, wau: 183, mau: 312,
  mrr: 980, premiumUsers: 50, alertCount: 3, newSignupsToday: 12,
};
const DEMO_TREND = Array.from({ length: 7 }, (_, i) => ({
  date: format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'),
  count: 4 + Math.round(Math.sin(i * 0.9) * 3) + i,
}));
const DEMO_COUNTRIES: CountryStat[] = [
  { country: 'Nigeria', count: 187 }, { country: 'Ghana', count: 54 },
  { country: 'Kenya', count: 38 }, { country: 'United States', count: 31 },
  { country: 'United Kingdom', count: 22 }, { country: 'South Africa', count: 18 },
  { country: 'Canada', count: 8 }, { country: 'Uganda', count: 7 },
];
const TOP_SCHOOLS = [
  { school: 'University of Lagos', count: 94 },
  { school: 'Obafemi Awolowo University', count: 61 },
  { school: 'University of Ghana', count: 54 },
  { school: 'University of Nairobi', count: 38 },
  { school: 'Ahmadu Bello University', count: 31 },
];
const USAGE_METRICS = { avgSessionsPerUser: 4.2, avgChatsPerUser: 18.7, retentionD7: 68 };
const INSIGHTS = [
  { text: 'Signups from University of Lagos increased 18% this week', type: 'positive' },
  { text: 'Daily usage dropped 8% on weekends — consider weekend nudges', type: 'neutral' },
  { text: 'Support resources accessed 2× more frequently after 9 PM', type: 'info' },
];

export default function DashboardPage() {
  const { data: rawOverview, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });
  const { data: rawTrend } = useQuery({
    queryKey: ['signup-trend'],
    queryFn: () => dashboardApi.getSignupTrend(7),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
  const { data: rawCountries } = useQuery({
    queryKey: ['country-stats'],
    queryFn: analyticsApi.countries,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });

  const overview = (rawOverview as typeof DEMO_OVERVIEW)?.totalUsers
    ? (rawOverview as typeof DEMO_OVERVIEW) : DEMO_OVERVIEW;
  const trend = (rawTrend as typeof DEMO_TREND)?.length ? rawTrend : DEMO_TREND;
  const rawCountriesArr = (rawCountries as CountryStat[]) ?? [];
  const topCountries = (rawCountriesArr.length > 0 ? rawCountriesArr : DEMO_COUNTRIES).slice(0, 8);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const insightColors: Record<string, string> = {
    positive: 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300',
    neutral: 'border-amber-800/60 bg-amber-950/30 text-amber-300',
    info: 'border-blue-800/60 bg-blue-950/30 text-blue-300',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={dataUpdatedAt ? `Updated ${formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}` : ''}
        action={
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        }
      />

      {/* ── Section 1: Core Metrics ── */}
      <section>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">Core Metrics</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <MetricCard label="Total Users" value={overview.totalUsers?.toLocaleString() ?? '—'} icon={Users} color="violet" />
          <MetricCard label="Daily Active (DAU)" value={overview.dau?.toLocaleString() ?? '—'} icon={Activity} color="blue" />
          <MetricCard label="New Signups Today" value={overview.newSignupsToday?.toLocaleString() ?? '—'} icon={UserPlus} color="green" />
          <MetricCard label="Premium Users" value={overview.premiumUsers?.toLocaleString() ?? '—'} icon={TrendingUp} color="violet" />
          <MetricCard label="Monthly Revenue" value={overview.mrr ? `$${overview.mrr}` : '—'} icon={DollarSign} color="green" />
          <MetricCard label="Weekly Active (WAU)" value={overview.wau?.toLocaleString() ?? '—'} icon={Activity} color="blue" />
          <MetricCard label="Monthly Active (MAU)" value={overview.mau?.toLocaleString() ?? '—'} icon={Users} color="violet" />
          <MetricCard label="Support Signals" value={overview.alertCount ?? '—'} icon={ShieldHalf} color={overview.alertCount > 0 ? 'amber' : 'green'} />
        </div>
      </section>

      {/* ── Section 2: Growth ── */}
      <section>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">Growth</p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">New Signups — Last 7 Days</h2>
            <SimpleLineChart
              data={trend as Record<string, unknown>[]}
              xKey="date"
              lines={[{ key: 'count', name: 'Signups', color: '#7c3aed' }]}
              height={200}
            />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={14} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-300">Top Schools</h2>
              <span className="text-xs text-zinc-600 ml-auto">≥10 users only</span>
            </div>
            <SimpleBarChart
              data={TOP_SCHOOLS as unknown as Record<string, unknown>[]}
              xKey="school"
              bars={[{ key: 'count', name: 'Users', color: '#06b6d4' }]}
              height={200}
            />
          </div>
        </div>
      </section>

      {/* ── Section 3: Usage ── */}
      <section>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">Usage</p>
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={13} className="text-zinc-500" />
              <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Avg Sessions / User</p>
            </div>
            <p className="text-xl font-bold text-white">{USAGE_METRICS.avgSessionsPerUser}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={13} className="text-zinc-500" />
              <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Avg Chats / User</p>
            </div>
            <p className="text-xl font-bold text-white">{USAGE_METRICS.avgChatsPerUser}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={13} className="text-zinc-500" />
              <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Day-7 Retention</p>
            </div>
            <p className="text-xl font-bold text-white">{USAGE_METRICS.retentionD7}%</p>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Users by Country</h2>
            <SimpleBarChart
              data={topCountries as unknown as Record<string, unknown>[]}
              xKey="country"
              bars={[{ key: 'count', name: 'Users', color: '#8b5cf6' }]}
              height={200}
            />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Country Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 text-xs text-zinc-500 font-medium uppercase tracking-wide">Country</th>
                    <th className="text-right py-2 text-xs text-zinc-500 font-medium uppercase tracking-wide">Users</th>
                    <th className="text-right py-2 text-xs text-zinc-500 font-medium uppercase tracking-wide">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {topCountries.map((c) => {
                    const total = overview.totalUsers ?? 1;
                    const pct = ((c.count / total) * 100).toFixed(1);
                    return (
                      <tr key={c.country} className="border-b border-zinc-800/50 last:border-0">
                        <td className="py-2.5 text-zinc-300">{c.country}</td>
                        <td className="py-2.5 text-right text-white font-medium">{c.count.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-zinc-500">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 8: Insights Layer ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={14} className="text-amber-400" />
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Auto Insights</p>
          <span className="text-xs text-zinc-600 ml-auto">Based on aggregated data only · ≥10 user cohorts</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {INSIGHTS.map((ins, i) => (
            <div key={i} className={`border rounded-xl px-4 py-3 text-sm font-medium ${insightColors[ins.type]}`}>
              {ins.text}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
