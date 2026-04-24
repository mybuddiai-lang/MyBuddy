'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Calendar, Filter, CheckCircle, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

type ReportType = 'users' | 'engagement' | 'ai_costs' | 'mental_health' | 'monetization' | 'alerts';

interface ReportDef {
  id: ReportType;
  label: string;
  description: string;
  icon: typeof FileText;
  color: string;
  bg: string;
  endpoint: string;
}

const REPORTS: ReportDef[] = [
  {
    id: 'users',
    label: 'User Export',
    description: 'All user accounts with school, tier, streak, and last active date.',
    icon: FileText,
    color: 'text-brand-600',
    bg: 'bg-brand-50',
    endpoint: '/admin/users',
  },
  {
    id: 'engagement',
    label: 'Engagement Report',
    description: 'DAU, WAU, MAU, and session data over the selected date range.',
    icon: FileText,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    endpoint: '/admin/analytics/dau',
  },
  {
    id: 'ai_costs',
    label: 'AI Cost Report',
    description: 'Token usage, message counts, and estimated cost breakdown.',
    icon: FileText,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    endpoint: '/admin/analytics/token-costs',
  },
  {
    id: 'mental_health',
    label: 'Mental Health Signals',
    description: 'Anonymized, aggregate score distributions. No PII included.',
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    endpoint: '/admin/analytics/sentiment-risks',
  },
  {
    id: 'alerts',
    label: 'Alerts Log',
    description: 'All system alerts with severity, type, resolution status, and timestamps.',
    icon: FileText,
    color: 'text-red-500',
    bg: 'bg-red-50',
    endpoint: '/admin/alerts',
  },
];

const RECENT_EXPORTS = [
  { id: 'r1', label: 'User Export', date: '2026-04-23 09:12', rows: 2089, status: 'done' },
  { id: 'r2', label: 'AI Cost Report', date: '2026-04-20 14:30', rows: 30, status: 'done' },
  { id: 'r3', label: 'Alerts Log', date: '2026-04-18 11:05', rows: 47, status: 'done' },
];

function toCSV(data: any[]): string {
  if (!data.length) return '';
  const keys = Object.keys(data[0]);
  const header = keys.join(',');
  const rows = data.map(row =>
    keys.map(k => {
      const val = row[k] ?? '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<Set<ReportType>>(new Set());
  const [loading, setLoading] = useState<ReportType | null>(null);

  const toggle = (id: ReportType) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExport = async (report: ReportDef) => {
    setLoading(report.id);
    try {
      let data: any[] = [];

      if (report.id === 'users') {
        const res = await apiClient.get(report.endpoint, { params: { limit: 5000 } });
        data = res.data.data?.users ?? res.data.data ?? [];
        // Strip sensitive fields
        data = data.map(({ id, name, email, school, subscriptionTier, studyStreak, sentimentBaseline, createdAt, lastActiveAt }: any) =>
          ({ id, name, email, school, subscriptionTier, studyStreak, sentimentBaseline, createdAt, lastActiveAt }));
      } else if (report.id === 'mental_health') {
        const res = await apiClient.get(report.endpoint);
        const risks = res.data.data ?? [];
        // Anonymize — no names/emails
        data = risks.map((_: any, i: number) => ({ anonymousId: `user_${i + 1}`, sentimentBaseline: _.sentimentBaseline, lastActiveAt: _.lastActiveAt }));
      } else {
        const res = await apiClient.get(report.endpoint);
        const raw = res.data.data;
        data = Array.isArray(raw) ? raw : [raw];
      }

      const csv = toCSV(data);
      const filename = `buddi-${report.id}-${dateFrom}-to-${dateTo}.csv`;
      downloadCSV(csv, filename);
      toast.success(`${report.label} exported (${data.length} rows)`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleExportAll = async () => {
    const targets = REPORTS.filter(r => selected.has(r.id));
    for (const r of targets) {
      await handleExport(r);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Reports & Exports</h1>
        <p className="text-zinc-500 text-sm mt-1">Generate and download CSV reports for any data set</p>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-zinc-500" />
          <h3 className="font-semibold text-zinc-800">Date Range</h3>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 font-medium">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 font-medium">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />
          </div>
          {/* Quick range buttons */}
          <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
            {[
              { label: '7d', days: 7 },
              { label: '30d', days: 30 },
              { label: '90d', days: 90 },
            ].map(({ label, days }) => (
              <button key={label} onClick={() => {
                const d = new Date();
                setDateTo(d.toISOString().slice(0, 10));
                d.setDate(d.getDate() - days);
                setDateFrom(d.toISOString().slice(0, 10));
              }}
                className="px-3 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:bg-white transition">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-800">Available Reports</h3>
          {selected.size > 0 && (
            <button onClick={handleExportAll}
              className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 transition">
              <Download size={14} /> Export {selected.size} selected
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {REPORTS.map((report, i) => {
            const Icon = report.icon;
            const isSelected = selected.has(report.id);
            const isLoading = loading === report.id;
            return (
              <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className={`bg-white rounded-2xl p-5 border-2 transition cursor-pointer ${isSelected ? 'border-brand-400 bg-brand-50/30' : 'border-zinc-100'} shadow-sm`}
                onClick={() => toggle(report.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${report.bg} rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={report.color} />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-800">{report.label}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{report.description}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${isSelected ? 'bg-brand-500 border-brand-500' : 'border-zinc-300'}`}>
                    {isSelected && <CheckCircle size={12} className="text-white" />}
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={e => { e.stopPropagation(); handleExport(report); }}
                    disabled={!!isLoading}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {isLoading
                      ? <><div className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin" /> Exporting…</>
                      : <><Download size={12} /> Export CSV</>
                    }
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recent exports */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-zinc-500" />
          <h3 className="font-semibold text-zinc-800">Recent Exports</h3>
        </div>
        <div className="divide-y divide-zinc-50">
          {RECENT_EXPORTS.map(exp => (
            <div key={exp.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-zinc-800">{exp.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{exp.date} · {exp.rows.toLocaleString()} rows</p>
              </div>
              <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">✓ Done</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
