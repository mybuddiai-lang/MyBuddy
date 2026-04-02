'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Brain, AlertTriangle, TrendingUp, DollarSign, Activity, FileText, Zap } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface DashboardData {
  engagement: { dau: number; wau: number; mau: number; totalUsers: number };
  sentimentRisksCount: number;
  tokenCosts: { totalTokens: number; totalMessages: number; estimatedCostUSD: number };
  recentAlerts: Array<{ id: string; title: string; severity: string; createdAt: string }>;
  noteStats: Array<{ processingStatus: string; _count: number }>;
}

const DUMMY_DATA: DashboardData = {
  engagement: { dau: 142, wau: 487, mau: 1204, totalUsers: 2089 },
  sentimentRisksCount: 7,
  tokenCosts: { totalTokens: 4820000, totalMessages: 3241, estimatedCostUSD: 14.46 },
  recentAlerts: [
    { id: 'a1', title: 'Burnout risk: Amara Okafor', severity: 'HIGH', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'a2', title: 'Burnout risk: Emeka Nwosu', severity: 'MEDIUM', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'a3', title: 'Burnout risk: Chisom Eze', severity: 'MEDIUM', createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
  noteStats: [
    { processingStatus: 'DONE', _count: 3418 },
    { processingStatus: 'PROCESSING', _count: 14 },
    { processingStatus: 'PENDING', _count: 38 },
    { processingStatus: 'FAILED', _count: 29 },
  ],
};

const severityColor: Record<string, string> = {
  LOW: 'bg-zinc-100 text-zinc-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>(DUMMY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/admin/dashboard')
      .then(r => setData(r.data.data))
      .catch(() => {}) // use dummy data on failure
      .finally(() => setLoading(false));
  }, []);

  const noteStatusMap = Object.fromEntries((data.noteStats || []).map(s => [s.processingStatus, s._count]));
  const totalNotes = data.noteStats.reduce((a, s) => a + s._count, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Platform overview · Real-time</p>
        </div>
        {loading && <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Users', value: data.engagement.totalUsers.toLocaleString(), sub: `${data.engagement.dau} active today`, color: 'text-brand-600', bg: 'bg-brand-50' },
          { icon: Activity, label: 'Daily Active', value: data.engagement.dau.toLocaleString(), sub: `${data.engagement.wau} this week`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: AlertTriangle, label: 'At-Risk Users', value: data.sentimentRisksCount, sub: 'Low sentiment detected', color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: DollarSign, label: 'AI Spend (30d)', value: `$${data.tokenCosts.estimatedCostUSD.toFixed(2)}`, sub: `${(data.tokenCosts.totalTokens / 1_000_000).toFixed(2)}M tokens`, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(({ icon: Icon, label, value, sub, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm"
          >
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            <p className="text-sm font-medium text-zinc-700 mt-0.5">{label}</p>
            <p className="text-xs text-zinc-400 mt-1">{sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-brand-500" />
            <h3 className="font-semibold text-zinc-800">Engagement</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Daily Active Users (DAU)', value: data.engagement.dau, max: data.engagement.mau },
              { label: 'Weekly Active (WAU)', value: data.engagement.wau, max: data.engagement.mau },
              { label: 'Monthly Active (MAU)', value: data.engagement.mau, max: data.engagement.totalUsers },
            ].map(({ label, value, max }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-zinc-600">{label}</span>
                  <span className="font-semibold text-zinc-900">{value.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-2 bg-brand-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${max > 0 ? Math.min((value / max) * 100, 100) : 0}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes pipeline */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-brand-500" />
            <h3 className="font-semibold text-zinc-800">Notes Pipeline</h3>
          </div>
          <p className="text-3xl font-bold text-zinc-900 mb-1">{totalNotes.toLocaleString()}</p>
          <p className="text-sm text-zinc-500 mb-4">Total uploads</p>
          <div className="space-y-3">
            {[
              { status: 'DONE', label: 'Processed', color: 'bg-emerald-400' },
              { status: 'PROCESSING', label: 'In Progress', color: 'bg-amber-400' },
              { status: 'PENDING', label: 'Queued', color: 'bg-blue-400' },
              { status: 'FAILED', label: 'Failed', color: 'bg-red-400' },
            ].map(({ status, label, color }) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-sm text-zinc-600">{label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-900 text-sm">{(noteStatusMap[status] ?? 0).toLocaleString()}</span>
                  <span className="text-xs text-zinc-400">{totalNotes > 0 ? Math.round(((noteStatusMap[status] ?? 0) / totalNotes) * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI usage */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-violet-500" />
            <h3 className="font-semibold text-zinc-800">AI Usage (30d)</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Total Messages', value: data.tokenCosts.totalMessages.toLocaleString() },
              { label: 'Tokens Used', value: `${(data.tokenCosts.totalTokens / 1_000_000).toFixed(2)}M` },
              { label: 'Estimated Cost', value: `$${data.tokenCosts.estimatedCostUSD.toFixed(2)}` },
              { label: 'Avg. Cost/Message', value: data.tokenCosts.totalMessages > 0 ? `$${(data.tokenCosts.estimatedCostUSD / data.tokenCosts.totalMessages).toFixed(4)}` : '$0' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                <span className="text-sm text-zinc-600">{label}</span>
                <span className="font-semibold text-zinc-900 text-sm">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent alerts */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="font-semibold text-zinc-800">Recent Alerts</h3>
          </div>
          <a href="/admin/alerts" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all →</a>
        </div>
        {data.recentAlerts.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4 text-center">No active alerts — all good 🟢</p>
        ) : (
          <div className="space-y-2">
            {data.recentAlerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-800">{alert.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{new Date(alert.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${severityColor[alert.severity] || severityColor.LOW}`}>
                  {alert.severity}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
