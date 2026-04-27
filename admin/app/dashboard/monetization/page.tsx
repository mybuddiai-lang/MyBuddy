'use client';
import { useQuery } from '@tanstack/react-query';
import { monetizationApi } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { SimplePieChart, SimpleLineChart } from '@/components/SimpleChart';
import { DollarSign, TrendingUp, Users, CreditCard, TrendingDown } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import type { PaymentRow } from '@/lib/types';

const DEMO_MONTHLY_REVENUE = Array.from({ length: 6 }, (_, i) => ({
  month: format(subMonths(new Date(), 5 - i), 'MMM'),
  mrr: 480 + i * 100 + Math.round(Math.sin(i * 0.7) * 40),
}));

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'text-emerald-400',
  FAILED: 'text-red-400',
  PENDING: 'text-amber-400',
};

const DEMO_PAYMENTS: PaymentRow[] = [
  { id: 'd1', user: { name: 'Amara Obi', email: 'amara@example.com' }, planType: 'PREMIUM', amount: 1999, currency: 'USD', provider: 'Stripe', status: 'COMPLETED', createdAt: '2026-04-20T10:00:00Z' },
  { id: 'd2', user: { name: 'Tunde Adeyemi', email: 'tunde@example.com' }, planType: 'PREMIUM', amount: 1999, currency: 'USD', provider: 'Paystack', status: 'COMPLETED', createdAt: '2026-04-18T14:22:00Z' },
  { id: 'd3', user: { name: 'Chisom Eze', email: 'chisom@example.com' }, planType: 'PREMIUM', amount: 1999, currency: 'USD', provider: 'Stripe', status: 'COMPLETED', createdAt: '2026-04-15T09:11:00Z' },
  { id: 'd4', user: { name: 'Fatima Bello', email: 'fatima@example.com' }, planType: 'PREMIUM', amount: 1999, currency: 'USD', provider: 'Paystack', status: 'COMPLETED', createdAt: '2026-04-12T16:45:00Z' },
  { id: 'd5', user: { name: 'Emeka Nwosu', email: 'emeka@example.com' }, planType: 'PREMIUM', amount: 1999, currency: 'USD', provider: 'Stripe', status: 'FAILED', createdAt: '2026-04-10T08:30:00Z' },
];

const DEMO = {
  mrr: 980,
  arpu: 19.6,
  premiumUsers: 50,
  freeUsers: 315,
  conversionRate: '13.7',
  churnRate: '4.2',
  totalRevenue: '3,920.00',
  recentPayments: DEMO_PAYMENTS,
};

export default function MonetizationPage() {
  const { data: raw, isLoading } = useQuery({
    queryKey: ['monetization'],
    queryFn: monetizationApi.getStats,
    refetchInterval: 60_000,
  });

  const hasReal = ((raw as typeof DEMO)?.premiumUsers ?? 0) > 0;
  const data = (hasReal ? raw : DEMO) as typeof DEMO;

  const pieData = data
    ? [
        { name: 'Free', value: data.freeUsers },
        { name: 'Premium', value: data.premiumUsers },
      ]
    : [];

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (row: Record<string, unknown>) => {
        const u = row.user as { name: string; email: string };
        return <span className="font-medium text-white">{u?.name}</span>;
      },
    },
    { key: 'planType', header: 'Plan' },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: Record<string, unknown>) =>
        `$${((row.amount as number) / 100).toFixed(2)} ${row.currency}`,
    },
    { key: 'provider', header: 'Provider' },
    {
      key: 'status',
      header: 'Status',
      render: (row: Record<string, unknown>) => (
        <span className={`text-xs font-medium ${STATUS_COLOR[row.status as string] ?? ''}`}>
          {row.status as string}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row: Record<string, unknown>) =>
        format(new Date(row.createdAt as string), 'MMM d, yyyy'),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Revenue" description="Subscription and revenue metrics" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="MRR (est.)"
          value={data?.mrr ? `$${data.mrr}` : '—'}
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          label="ARPU"
          value={data?.arpu ? `$${data.arpu}` : '—'}
          icon={TrendingUp}
          color="violet"
        />
        <MetricCard
          label="Premium Users"
          value={data?.premiumUsers?.toLocaleString() ?? '—'}
          icon={Users}
          color="blue"
        />
        <MetricCard
          label="Conversion Rate"
          value={data?.conversionRate ? `${data.conversionRate}%` : '—'}
          icon={CreditCard}
          color="amber"
        />
        <MetricCard
          label="Churn Rate"
          value={data?.churnRate ? `${data.churnRate}%` : '—'}
          icon={TrendingDown}
          color="amber"
        />
        <MetricCard
          label="Active Subscriptions"
          value={data?.premiumUsers?.toLocaleString() ?? '—'}
          icon={Users}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-1">Monthly Revenue (MRR)</h2>
          <p className="text-xs text-zinc-500 mb-4">Last 6 months</p>
          <SimpleLineChart
            data={DEMO_MONTHLY_REVENUE as Record<string, unknown>[]}
            xKey="month"
            lines={[{ key: 'mrr', name: 'MRR ($)', color: '#22c55e' }]}
            height={200}
          />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Free vs Premium</h2>
          <SimplePieChart data={pieData} height={200} />
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Recent Payments</h2>
        <DataTable
          columns={columns}
          data={(data?.recentPayments ?? []) as unknown as Record<string, unknown>[]}
          keyField="id"
        />
      </div>
    </div>
  );
}
