'use client';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, analyticsApi } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';
import { SimpleLineChart, SimpleBarChart } from '@/components/SimpleChart';
import { Users, Activity, DollarSign, AlertTriangle, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CountryStat } from '@/lib/types';

export default function DashboardPage() {
  const { data: overview, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    refetchInterval: 15_000,
  });

  const { data: trend } = useQuery({
    queryKey: ['signup-trend'],
    queryFn: () => dashboardApi.getSignupTrend(7),
    refetchInterval: 60_000,
  });

  const { data: countries } = useQuery({
    queryKey: ['country-stats'],
    queryFn: analyticsApi.countries,
    refetchInterval: 60_000,
  });

  // Top 10 countries for chart
  const topCountries = ((countries as CountryStat[]) ?? []).slice(0, 10);

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
        title="Overview"
        description={
          dataUpdatedAt
            ? `Updated ${formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}`
            : ''
        }
        action={
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-5">
        <MetricCard
          label="Total Users"
          value={overview?.totalUsers?.toLocaleString() ?? '—'}
          icon={Users}
          color="violet"
        />
        <MetricCard
          label="Daily Active"
          value={overview?.dau?.toLocaleString() ?? '—'}
          icon={Activity}
          color="blue"
        />
        <MetricCard
          label="MRR (est.)"
          value={overview?.mrr ? `$${overview.mrr}` : '—'}
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          label="Distress Alerts"
          value={overview?.alertCount ?? '—'}
          icon={AlertTriangle}
          color={overview?.alertCount > 0 ? 'red' : 'amber'}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-5">
        {[
          { label: 'WAU', value: overview?.wau },
          { label: 'MAU', value: overview?.mau },
          { label: 'Premium', value: overview?.premiumUsers },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1">
              {label}
            </p>
            <p className="text-lg md:text-xl font-bold text-white">
              {value?.toLocaleString() ?? '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Signup trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">New Signups — Last 7 Days</h2>
          {trend ? (
            <SimpleLineChart
              data={trend as Record<string, unknown>[]}
              xKey="date"
              lines={[{ key: 'count', name: 'Signups', color: '#7c3aed' }]}
              height={200}
            />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm">
              Loading…
            </div>
          )}
        </div>

        {/* Country breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={14} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Users by Country</h2>
          </div>
          {topCountries.length > 0 ? (
            <SimpleBarChart
              data={topCountries as unknown as Record<string, unknown>[]}
              xKey="country"
              bars={[{ key: 'count', name: 'Users', color: '#06b6d4' }]}
              height={200}
            />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm">
              No country data yet
            </div>
          )}
        </div>
      </div>

      {/* Country table */}
      {topCountries.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Country Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 text-xs text-zinc-500 font-medium uppercase tracking-wide">
                    Country
                  </th>
                  <th className="text-right py-2 text-xs text-zinc-500 font-medium uppercase tracking-wide">
                    Users
                  </th>
                  <th className="text-right py-2 text-xs text-zinc-500 font-medium uppercase tracking-wide">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {topCountries.map((c) => {
                  const total = overview?.totalUsers ?? 1;
                  const pct = ((c.count / total) * 100).toFixed(1);
                  return (
                    <tr key={c.country} className="border-b border-zinc-800/50 last:border-0">
                      <td className="py-2.5 text-zinc-300">{c.country}</td>
                      <td className="py-2.5 text-right text-white font-medium">
                        {c.count.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right text-zinc-500">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
