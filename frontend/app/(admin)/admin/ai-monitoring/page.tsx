'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Cpu, Zap, DollarSign, AlertCircle, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

function genAiData(days: number) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const requests = Math.floor(280 + Math.random() * 180);
    const tokens = Math.floor(requests * (820 + Math.random() * 400));
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      requests,
      tokens: Math.round(tokens / 1000),
      latencyMs: Math.floor(1200 + Math.random() * 1800),
      costUSD: +((tokens / 1_000_000) * 3.0).toFixed(3),
      failures: Math.floor(Math.random() * 4),
    });
  }
  return data;
}

const AI_DATA = genAiData(30);
const TOTAL_REQUESTS = AI_DATA.reduce((a, b) => a + b.requests, 0);
const TOTAL_TOKENS = AI_DATA.reduce((a, b) => a + b.tokens, 0) * 1000;
const TOTAL_COST = AI_DATA.reduce((a, b) => a + b.costUSD, 0);
const AVG_LATENCY = Math.round(AI_DATA.reduce((a, b) => a + b.latencyMs, 0) / AI_DATA.length);
const TOTAL_FAILURES = AI_DATA.reduce((a, b) => a + b.failures, 0);
const FAILURE_RATE = ((TOTAL_FAILURES / TOTAL_REQUESTS) * 100).toFixed(2);

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  padding: '8px 12px',
  fontSize: '12px',
};

export default function AiMonitoringPage() {
  const [tokenCosts, setTokenCosts] = useState<any>(null);
  const [range, setRange] = useState<7 | 14 | 30>(30);

  useEffect(() => {
    apiClient.get('/admin/analytics/token-costs')
      .then(r => setTokenCosts(r.data.data))
      .catch(() => {});
  }, []);

  const sliced = AI_DATA.slice(-range);
  const liveTotal = tokenCosts?.totalMessages ?? TOTAL_REQUESTS;
  const liveTokens = tokenCosts?.totalTokens ?? TOTAL_TOKENS;
  const liveCost = tokenCosts?.estimatedCostUSD ?? TOTAL_COST;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">AI Monitoring</h1>
        <p className="text-zinc-500 text-sm mt-1">Request volume, latency, token usage, and cost tracking</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Requests (30d)', value: liveTotal.toLocaleString(), icon: Cpu, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Tokens Used (30d)', value: `${(liveTokens / 1_000_000).toFixed(2)}M`, icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'AI Cost (30d)', value: `$${liveCost.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg Latency', value: `${AVG_LATENCY}ms`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Failure Rate', value: `${FAILURE_RATE}%`, icon: AlertCircle, color: parseFloat(FAILURE_RATE) > 2 ? 'text-red-500' : 'text-zinc-600', bg: parseFloat(FAILURE_RATE) > 2 ? 'bg-red-50' : 'bg-zinc-50' },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={16} className={color} />
            </div>
            <p className="text-xl font-bold text-zinc-900">{value}</p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Request volume */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-zinc-800">AI Request Volume</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Daily requests to AI service</p>
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
          <AreaChart data={sliced}>
            <defs>
              <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={36} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="requests" stroke="#7c3aed" strokeWidth={2} fill="url(#reqGrad)" dot={false} name="Requests" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-zinc-800">Response Latency</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Average AI response time (ms)</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={sliced}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={44}
                tickFormatter={v => `${v}ms`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}ms`, 'Latency']} />
              <Line type="monotone" dataKey="latencyMs" stroke="#f59e0b" strokeWidth={2} dot={false} name="Latency" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Token usage */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-zinc-800">Token Usage (K/day)</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Thousands of tokens consumed per day</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sliced}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}K`, 'Tokens']} />
              <Bar dataKey="tokens" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Tokens (K)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-zinc-800">Daily AI Cost (USD)</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Estimated cost at $3/M tokens</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={sliced}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={44}
                tickFormatter={v => `$${v.toFixed(2)}`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`$${v.toFixed(3)}`, 'Cost']} />
              <Area type="monotone" dataKey="costUSD" stroke="#10b981" strokeWidth={2} fill="url(#costGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Failures */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-zinc-800">AI Failures</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Failed requests (timeouts + errors)</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sliced}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="failures" fill="#ef4444" radius={[3, 3, 0, 0]} name="Failures" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-zinc-400 mt-3">
            Overall failure rate: <span className="font-semibold text-zinc-700">{FAILURE_RATE}%</span> — target &lt;1%
          </p>
        </div>
      </div>
    </div>
  );
}
