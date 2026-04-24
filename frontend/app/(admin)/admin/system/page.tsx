'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Server, CheckCircle, AlertCircle, Clock, Cpu, Database, Activity } from 'lucide-react';

function genUptimeData(days: number) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      uptime: +(99.2 + Math.random() * 0.8).toFixed(2),
      errorRate: +(0.1 + Math.random() * 0.5).toFixed(2),
      p99Latency: Math.floor(180 + Math.random() * 120),
    });
  }
  return data;
}

const UPTIME_DATA = genUptimeData(30);
const AVG_UPTIME = (UPTIME_DATA.reduce((a, b) => a + b.uptime, 0) / UPTIME_DATA.length).toFixed(2);
const AVG_ERROR = (UPTIME_DATA.reduce((a, b) => a + b.errorRate, 0) / UPTIME_DATA.length).toFixed(2);
const AVG_P99 = Math.round(UPTIME_DATA.reduce((a, b) => a + b.p99Latency, 0) / UPTIME_DATA.length);

const SERVICES = [
  { name: 'API Server', status: 'HEALTHY', uptime: '99.98%', latency: '142ms', region: 'Railway EU' },
  { name: 'Database (PostgreSQL)', status: 'HEALTHY', uptime: '99.99%', latency: '8ms', region: 'Railway EU' },
  { name: 'Cloudflare R2 (Storage)', status: 'HEALTHY', uptime: '100%', latency: '45ms', region: 'Global CDN' },
  { name: 'AI Service (OpenAI)', status: 'HEALTHY', uptime: '99.71%', latency: '1.4s', region: 'OpenAI US' },
  { name: 'Frontend (Vercel)', status: 'HEALTHY', uptime: '99.99%', latency: '32ms', region: 'Vercel Edge' },
  { name: 'Email / Notifications', status: 'DEGRADED', uptime: '97.20%', latency: '810ms', region: 'SendGrid' },
];

const JOBS = [
  { name: 'Burnout Risk Scan', schedule: 'Daily @ 2 AM', lastRun: '2026-04-24 02:00', status: 'OK', duration: '3.2s' },
  { name: 'Resilience Score Update', schedule: 'Daily @ 3 AM', lastRun: '2026-04-24 03:00', status: 'OK', duration: '8.1s' },
  { name: 'Streak Reset', schedule: 'Daily @ 12:05 AM', lastRun: '2026-04-24 00:05', status: 'OK', duration: '1.4s' },
  { name: 'Analytics Aggregation', schedule: 'Hourly', lastRun: '2026-04-24 07:00', status: 'OK', duration: '0.9s' },
  { name: 'AI Processing Queue', schedule: 'Continuous', lastRun: '2026-04-24 07:42', status: 'RUNNING', duration: '—' },
];

const statusBadge: Record<string, string> = {
  HEALTHY: 'bg-emerald-100 text-emerald-700',
  DEGRADED: 'bg-amber-100 text-amber-700',
  DOWN: 'bg-red-100 text-red-700',
  OK: 'bg-emerald-100 text-emerald-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
};

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  padding: '8px 12px',
  fontSize: '12px',
};

export default function SystemHealthPage() {
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const sliced = UPTIME_DATA.slice(-range);

  const healthyCount = SERVICES.filter(s => s.status === 'HEALTHY').length;
  const degradedCount = SERVICES.filter(s => s.status === 'DEGRADED').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">System Health</h1>
        <p className="text-zinc-500 text-sm mt-1">API uptime, error rates, and background job status</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Uptime (30d)', value: `${AVG_UPTIME}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg Error Rate', value: `${AVG_ERROR}%`, icon: AlertCircle, color: parseFloat(AVG_ERROR) > 1 ? 'text-red-500' : 'text-zinc-600', bg: parseFloat(AVG_ERROR) > 1 ? 'bg-red-50' : 'bg-zinc-50' },
          { label: 'P99 Latency', value: `${AVG_P99}ms`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Services Healthy', value: `${healthyCount}/${SERVICES.length}`, icon: Server, color: degradedCount > 0 ? 'text-amber-600' : 'text-emerald-600', bg: degradedCount > 0 ? 'bg-amber-50' : 'bg-emerald-50' },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            <p className="text-sm font-medium text-zinc-700 mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Uptime + error rate charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-zinc-800">API Uptime</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Daily uptime percentage</p>
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
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={sliced}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis domain={[98, 100]} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={36}
                tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Uptime']} />
              <Line type="monotone" dataKey="uptime" stroke="#10b981" strokeWidth={2} dot={false} name="Uptime" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-zinc-800">Error Rate</h3>
            <p className="text-xs text-zinc-400 mt-0.5">API 5xx error rate per day (%)</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={sliced}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={36}
                tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Error Rate']} />
              <Line type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} dot={false} name="Error Rate" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service status table */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Activity size={17} className="text-brand-500" />
          <h3 className="font-semibold text-zinc-800">Service Status</h3>
          {degradedCount > 0 && (
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{degradedCount} degraded</span>
          )}
        </div>
        <div className="space-y-2">
          {SERVICES.map((svc, i) => (
            <motion.div key={svc.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-3.5 bg-zinc-50 rounded-xl">
              <div className={`w-2 h-2 rounded-full shrink-0 ${svc.status === 'HEALTHY' ? 'bg-emerald-400' : svc.status === 'DEGRADED' ? 'bg-amber-400' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800">{svc.name}</p>
                <p className="text-xs text-zinc-400">{svc.region}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-zinc-800">{svc.uptime}</p>
                <p className="text-[10px] text-zinc-400">uptime</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-zinc-800">{svc.latency}</p>
                <p className="text-[10px] text-zinc-400">latency</p>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusBadge[svc.status]}`}>
                {svc.status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Background jobs */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Cpu size={17} className="text-brand-500" />
          <h3 className="font-semibold text-zinc-800">Background Jobs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left text-xs text-zinc-500 font-medium pb-3">Job</th>
                <th className="text-left text-xs text-zinc-500 font-medium pb-3">Schedule</th>
                <th className="text-left text-xs text-zinc-500 font-medium pb-3">Last Run</th>
                <th className="text-center text-xs text-zinc-500 font-medium pb-3">Duration</th>
                <th className="text-center text-xs text-zinc-500 font-medium pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {JOBS.map(job => (
                <tr key={job.name} className="hover:bg-zinc-50 transition">
                  <td className="py-3 font-medium text-zinc-800">{job.name}</td>
                  <td className="py-3 text-xs text-zinc-500">{job.schedule}</td>
                  <td className="py-3 text-xs text-zinc-500">{job.lastRun}</td>
                  <td className="py-3 text-xs text-zinc-600 text-center">{job.duration}</td>
                  <td className="py-3 text-center">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusBadge[job.status]}`}>
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
