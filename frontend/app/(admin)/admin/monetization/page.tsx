'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DollarSign, Users, TrendingUp, CreditCard, XCircle, RefreshCw } from 'lucide-react';

function genMrrData() {
  const data = [];
  const now = new Date();
  let mrr = 2800;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    mrr = mrr + Math.floor((Math.random() - 0.2) * 300 + 150);
    data.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      mrr,
      subs: Math.floor(mrr / 9.99),
    });
  }
  return data;
}

const MRR_DATA = genMrrData();
const CURRENT_MRR = MRR_DATA[MRR_DATA.length - 1].mrr;
const ACTIVE_SUBS = MRR_DATA[MRR_DATA.length - 1].subs;
const FREE_USERS = 2089 - ACTIVE_SUBS;
const ARPU = ACTIVE_SUBS > 0 ? (CURRENT_MRR / ACTIVE_SUBS).toFixed(2) : '0';
const CONVERSION = ((ACTIVE_SUBS / 2089) * 100).toFixed(1);

const SUB_EVENTS = [
  { id: 'e1', type: 'start', user: 'A. Okafor', plan: 'PREMIUM', amount: '$9.99', date: '2026-04-24', icon: CreditCard, color: 'bg-emerald-100 text-emerald-700', label: 'New Sub' },
  { id: 'e2', type: 'start', user: 'E. Nwosu', plan: 'PREMIUM', amount: '$9.99', date: '2026-04-23', icon: CreditCard, color: 'bg-emerald-100 text-emerald-700', label: 'New Sub' },
  { id: 'e3', type: 'cancel', user: 'B. Fashola', plan: 'PREMIUM', amount: '$9.99', date: '2026-04-22', icon: XCircle, color: 'bg-zinc-100 text-zinc-600', label: 'Cancelled' },
  { id: 'e4', type: 'failure', user: 'C. Eze', plan: 'PREMIUM', amount: '$9.99', date: '2026-04-21', icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Failed' },
  { id: 'e5', type: 'start', user: 'N. Obi', plan: 'PREMIUM', amount: '$9.99', date: '2026-04-20', icon: CreditCard, color: 'bg-emerald-100 text-emerald-700', label: 'New Sub' },
  { id: 'e6', type: 'renew', user: 'K. Adeyemi', plan: 'PREMIUM', amount: '$9.99', date: '2026-04-19', icon: RefreshCw, color: 'bg-blue-100 text-blue-700', label: 'Renewed' },
];

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  padding: '8px 12px',
  fontSize: '12px',
};

export default function MonetizationPage() {
  const [range, setRange] = useState<3 | 6 | 12>(12);
  const sliced = MRR_DATA.slice(-range);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Monetization</h1>
        <p className="text-zinc-500 text-sm mt-1">Revenue metrics, subscriptions, and billing events</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'MRR', value: `$${CURRENT_MRR.toLocaleString()}`, sub: 'Monthly recurring revenue', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Active Subscriptions', value: ACTIVE_SUBS.toLocaleString(), sub: `${FREE_USERS.toLocaleString()} on free tier`, icon: Users, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'ARPU', value: `$${ARPU}`, sub: 'Avg revenue per user', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Conversion', value: `${CONVERSION}%`, sub: 'Free → Paid', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, sub, icon: Icon, color, bg }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            <p className="text-sm font-medium text-zinc-700 mt-0.5">{label}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* MRR chart */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-zinc-800">MRR Trend</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Monthly recurring revenue over time</p>
          </div>
          <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
            {([3, 6, 12] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${range === r ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {r}mo
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={sliced}>
            <defs>
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={52}
              tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`$${v.toLocaleString()}`, 'MRR']} />
            <Area type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={2} fill="url(#mrrGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscribers bar */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-zinc-800">Active Subscriptions</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Monthly subscriber count</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sliced}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="subs" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Subscribers" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-zinc-800">Plan Breakdown</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Distribution across pricing tiers</p>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Free', count: FREE_USERS, pct: (FREE_USERS / 2089) * 100, color: 'bg-zinc-300' },
              { label: 'Premium Monthly', count: Math.floor(ACTIVE_SUBS * 0.72), pct: (ACTIVE_SUBS * 0.72 / 2089) * 100, color: 'bg-brand-500' },
              { label: 'Premium Annual', count: Math.floor(ACTIVE_SUBS * 0.28), pct: (ACTIVE_SUBS * 0.28 / 2089) * 100, color: 'bg-emerald-500' },
            ].map(tier => (
              <div key={tier.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-zinc-600">{tier.label}</span>
                  <span className="font-semibold text-zinc-900">{tier.count.toLocaleString()} <span className="text-zinc-400 font-normal text-xs">({tier.pct.toFixed(0)}%)</span></span>
                </div>
                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <motion.div className={`h-2 ${tier.color} rounded-full`} initial={{ width: 0 }}
                    animate={{ width: `${tier.pct}%` }} transition={{ duration: 0.8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Billing events */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="mb-4">
          <h3 className="font-semibold text-zinc-800">Subscription Events</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Recent billing activity</p>
        </div>
        <div className="divide-y divide-zinc-50">
          {SUB_EVENTS.map(evt => {
            const Icon = evt.icon;
            return (
              <div key={evt.id} className="flex items-center gap-4 py-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${evt.color}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{evt.user}</p>
                  <p className="text-xs text-zinc-400">{evt.plan} · {evt.date}</p>
                </div>
                <span className="text-sm font-semibold text-zinc-800">{evt.amount}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${evt.color}`}>{evt.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
