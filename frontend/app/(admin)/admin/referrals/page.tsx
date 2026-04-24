'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowUpRight, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

function generateTrend() {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const shown = Math.floor(12 + Math.random() * 10);
    const accepted = Math.floor(shown * (0.35 + Math.random() * 0.2));
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      distress: Math.floor(18 + Math.random() * 12),
      shown,
      accepted,
    });
  }
  return data;
}

const TREND = generateTrend();
const TOTAL_DISTRESS = TREND.reduce((a, b) => a + b.distress, 0);
const TOTAL_SHOWN = TREND.reduce((a, b) => a + b.shown, 0);
const TOTAL_ACCEPTED = TREND.reduce((a, b) => a + b.accepted, 0);
const CONVERSION = TOTAL_SHOWN > 0 ? ((TOTAL_ACCEPTED / TOTAL_SHOWN) * 100).toFixed(1) : '0';

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  padding: '8px 12px',
  fontSize: '12px',
};

const FUNNEL_STEPS = [
  { label: 'Distress Detected', value: TOTAL_DISTRESS, color: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle, pct: 100 },
  { label: 'Referral Shown', value: TOTAL_SHOWN, color: 'bg-amber-100', text: 'text-amber-700', icon: ArrowUpRight, pct: (TOTAL_SHOWN / TOTAL_DISTRESS) * 100 },
  { label: 'Referral Accepted', value: TOTAL_ACCEPTED, color: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle, pct: (TOTAL_ACCEPTED / TOTAL_DISTRESS) * 100 },
];

export default function ReferralsPage() {
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const sliced = TREND.slice(-range);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Referrals &amp; Interventions</h1>
        <p className="text-zinc-500 text-sm mt-1">Track how users engage with professional support resources</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Distress Events', value: TOTAL_DISTRESS.toLocaleString(), sub: 'Last 30 days', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Referrals Shown', value: TOTAL_SHOWN.toLocaleString(), sub: `${((TOTAL_SHOWN / TOTAL_DISTRESS) * 100).toFixed(0)}% of distress events`, icon: ArrowUpRight, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Referrals Accepted', value: TOTAL_ACCEPTED.toLocaleString(), sub: `${CONVERSION}% acceptance rate`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Conversion Rate', value: `${CONVERSION}%`, sub: 'Shown → Accepted', icon: TrendingUp, color: 'text-brand-600', bg: 'bg-brand-50' },
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

      {/* Funnel */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm">
        <div className="mb-6">
          <h3 className="font-semibold text-zinc-800">Intervention Funnel</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Distress detection → referral shown → referral accepted</p>
        </div>
        <div className="space-y-4">
          {FUNNEL_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 ${step.color} rounded-lg flex items-center justify-center`}>
                      <Icon size={14} className={step.text} />
                    </div>
                    <span className="text-sm font-medium text-zinc-800">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">{step.pct.toFixed(0)}%</span>
                    <span className="text-sm font-bold text-zinc-900">{step.value.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-8 bg-zinc-50 rounded-xl overflow-hidden">
                  <motion.div className={`h-full ${step.color} rounded-xl`}
                    initial={{ width: 0 }} animate={{ width: `${step.pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.15 }} />
                </div>
                {i < FUNNEL_STEPS.length - 1 && (
                  <div className="flex justify-center mt-2 text-xs text-zinc-400">
                    ↓ {((FUNNEL_STEPS[i + 1].value / step.value) * 100).toFixed(0)}% passed through
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-zinc-800">Referral Trends</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Daily referral events over time</p>
          </div>
          <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
            {([7, 14, 30] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${range === r ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {r}d
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={sliced}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={28} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line type="monotone" dataKey="distress" stroke="#ef4444" strokeWidth={2} dot={false} name="Distress" />
            <Line type="monotone" dataKey="shown" stroke="#f59e0b" strokeWidth={2} dot={false} name="Shown" />
            <Line type="monotone" dataKey="accepted" stroke="#10b981" strokeWidth={2} dot={false} name="Accepted" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 inline-block" />Distress</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 inline-block" />Shown</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 inline-block" />Accepted</span>
        </div>
      </div>
    </div>
  );
}
