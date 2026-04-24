'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Heart, AlertTriangle, ShieldCheck, TrendingDown } from 'lucide-react';

const SCORE_DISTRIBUTION = [
  { bucket: '0–4', label: 'Minimal', count: 312, color: '#10b981' },
  { bucket: '5–9', label: 'Mild', count: 489, color: '#3b82f6' },
  { bucket: '10–14', label: 'Moderate', count: 287, color: '#f59e0b' },
  { bucket: '15–19', label: 'Moderately Severe', count: 94, color: '#f97316' },
  { bucket: '20+', label: 'Severe', count: 31, color: '#ef4444' },
];

function generateTrend() {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgScore: +(6.2 + Math.sin(i / 4) * 1.8 + (Math.random() - 0.5) * 0.8).toFixed(1),
      distressCount: Math.floor(18 + Math.sin(i / 5) * 8 + Math.random() * 5),
    });
  }
  return data;
}

const TREND_DATA = generateTrend();
const TOTAL = SCORE_DISTRIBUTION.reduce((a, b) => a + b.count, 0);
const DISTRESS = SCORE_DISTRIBUTION.filter(b => b.bucket === '15–19' || b.bucket === '20+').reduce((a, b) => a + b.count, 0);

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  padding: '8px 12px',
  fontSize: '12px',
};

export default function MentalHealthPage() {
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const sliced = TREND_DATA.slice(-range);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Mental Health Signals</h1>
        <p className="text-zinc-500 text-sm mt-1">Anonymized aggregate wellness data — no individual identifiers</p>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <ShieldCheck size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Privacy-First Design</p>
          <p className="text-xs text-blue-600 mt-0.5">
            All metrics shown here are fully anonymized population-level aggregates. No personally identifiable information is linked to any mental health score. Data is governed by GDPR and NDPR compliance standards.
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Submissions', value: TOTAL.toLocaleString(), sub: 'PHQ-9 / GAD-7', icon: Heart, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Distress Detected', value: DISTRESS.toLocaleString(), sub: `${((DISTRESS / TOTAL) * 100).toFixed(1)}% of submissions`, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Avg. PHQ-9 Score', value: '7.8', sub: 'Population average', icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Moderate–Severe', value: `${(((DISTRESS + 287) / TOTAL) * 100).toFixed(0)}%`, sub: 'Score ≥ 10', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-zinc-800">Score Distribution</h3>
            <p className="text-xs text-zinc-400 mt-0.5">PHQ-9 severity buckets (anonymized counts)</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={SCORE_DISTRIBUTION}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Users" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {SCORE_DISTRIBUTION.map(b => (
              <div key={b.bucket} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                <span className="text-xs text-zinc-600 w-36">{b.bucket} — {b.label}</span>
                <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-1.5 rounded-full" style={{ width: `${(b.count / TOTAL) * 100}%`, backgroundColor: b.color }} />
                </div>
                <span className="text-xs font-semibold text-zinc-800 w-10 text-right">{b.count}</span>
                <span className="text-xs text-zinc-400 w-10 text-right">{((b.count / TOTAL) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Average score trend */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-zinc-800">Average Score Trend</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Population-level PHQ-9 average over time</p>
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
              <YAxis domain={[0, 21]} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="avgScore" stroke="#f59e0b" strokeWidth={2} dot={false} name="Avg Score" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 inline-block" />0–9 Minimal/Mild</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 inline-block" />10–14 Moderate</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 inline-block" />15+ Severe</span>
          </div>
        </div>
      </div>

      {/* Distress trend */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="mb-5">
          <h3 className="font-semibold text-zinc-800">Distress Signals Over Time</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Anonymous count of users flagged for distress daily</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={sliced}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={28} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="distressCount" fill="#ef4444" radius={[3, 3, 0, 0]} name="Distress Flags" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-zinc-400 mt-3">
          Flagged = PHQ-9 score ≥ 15 OR repeated submission within 48h. Tracking is anonymous and cannot be linked to individuals.
        </p>
      </div>
    </div>
  );
}
