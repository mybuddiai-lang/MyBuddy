'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, AlertTriangle, Search, User, Clock, ChevronRight, CreditCard } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';

interface Alert {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  createdAt: string;
  resolvedAt?: string;
  user?: { name: string; email: string };
}

const ACTIVITY = [
  { id: 'ev1', type: 'login', user: 'Amara Okafor', message: 'Logged in from Lagos', time: '2 min ago', color: 'bg-blue-100 text-blue-600' },
  { id: 'ev2', type: 'upload', user: 'Emeka Nwosu', message: 'Uploaded "Cardiology Notes.pdf"', time: '5 min ago', color: 'bg-brand-100 text-brand-600' },
  { id: 'ev3', type: 'chat', user: 'Chisom Eze', message: 'Started AI chat session', time: '8 min ago', color: 'bg-emerald-100 text-emerald-600' },
  { id: 'ev4', type: 'payment', user: 'Bola Fashola', message: 'Subscribed to Premium', time: '14 min ago', color: 'bg-amber-100 text-amber-600' },
  { id: 'ev5', type: 'alert', user: 'Ngozi Obi', message: 'Burnout risk detected (sentiment 0.18)', time: '22 min ago', color: 'bg-red-100 text-red-600' },
  { id: 'ev6', type: 'login', user: 'Tunde Adeyemi', message: 'Logged in from Ibadan', time: '31 min ago', color: 'bg-blue-100 text-blue-600' },
  { id: 'ev7', type: 'upload', user: 'Fatima Bello', message: 'Uploaded "Criminal Law Notes.pdf"', time: '44 min ago', color: 'bg-brand-100 text-brand-600' },
  { id: 'ev8', type: 'chat', user: 'Kemi Adesanya', message: 'AI session — 24 messages sent', time: '1 hr ago', color: 'bg-emerald-100 text-emerald-600' },
];

const DUMMY_ALERTS: Alert[] = [
  { id: 'a1', title: 'Burnout Risk Detected', severity: 'HIGH', description: 'User sentiment below 0.2 for 3+ consecutive days', createdAt: new Date(Date.now() - 3600000).toISOString(), user: { name: 'Ngozi Obi', email: 'ngozi@imsu.edu' } },
  { id: 'a2', title: 'Burnout Risk Detected', severity: 'MEDIUM', description: 'Sentiment declined significantly in last 48h', createdAt: new Date(Date.now() - 7200000).toISOString(), user: { name: 'Chisom Eze', email: 'chisom@uniben.edu' } },
  { id: 'a3', title: 'Payment Failure', severity: 'MEDIUM', description: 'Stripe charge failed — card declined', createdAt: new Date(Date.now() - 14400000).toISOString(), user: { name: 'M. Ibrahim', email: 'm.ibrahim@abu.edu' } },
  { id: 'a4', title: 'AI Response Timeout', severity: 'HIGH', description: 'OpenAI latency exceeded 10s — 3 requests dropped', createdAt: new Date(Date.now() - 86400000).toISOString() },
];

const severityColor: Record<string, string> = {
  LOW: 'bg-zinc-100 text-zinc-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function OperationsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(DUMMY_ALERTS);
  const [lookup, setLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [alertTab, setAlertTab] = useState<'active' | 'resolved'>('active');

  const activeAlerts = alerts.filter(a => !a.resolvedAt);
  const resolvedAlerts = alerts.filter(a => !!a.resolvedAt);
  const displayedAlerts = alertTab === 'active' ? activeAlerts : resolvedAlerts;

  const handleResolve = async (id: string) => {
    try { await apiClient.post(`/admin/alerts/${id}/resolve`); } catch {}
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolvedAt: new Date().toISOString() } : a));
  };

  const handleLookup = async () => {
    if (!lookup.trim()) return;
    setLookupLoading(true);
    try {
      const res = await apiClient.get('/admin/users', { params: { search: lookup, limit: 1 } });
      const users = res.data.data?.users ?? [];
      setLookupResult(users[0] ?? null);
    } catch {
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Operations</h1>
        <p className="text-zinc-500 text-sm mt-1">Live activity feed, alert system, and user lookup</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Alerts', value: activeAlerts.length, color: activeAlerts.length > 0 ? 'text-red-500' : 'text-emerald-600' },
          { label: 'Resolved (24h)', value: resolvedAlerts.length, color: 'text-zinc-600' },
          { label: 'Live Users (DAU)', value: 142, color: 'text-brand-600' },
        ].map(({ label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm text-center">
            <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
            <p className="text-sm text-zinc-500">{label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live activity feed */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <h3 className="font-semibold text-zinc-800">Live Activity</h3>
            <span className="ml-auto text-xs text-zinc-400">Last hour</span>
          </div>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {ACTIVITY.map((evt, i) => (
              <motion.div key={evt.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-50 transition">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${evt.color}`}>
                  {evt.type === 'payment' ? <CreditCard size={13} /> : evt.type === 'alert' ? <AlertTriangle size={13} /> : <Radio size={13} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{evt.user}</p>
                  <p className="text-xs text-zinc-400 truncate">{evt.message}</p>
                </div>
                <span className="text-[10px] text-zinc-400 shrink-0 mt-0.5">{evt.time}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* User lookup */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-zinc-500" />
            <h3 className="font-semibold text-zinc-800">User Lookup</h3>
          </div>
          <div className="flex gap-2 mb-4">
            <input type="text" value={lookup} onChange={e => setLookup(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              placeholder="Search by name or email…"
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />
            <button onClick={handleLookup} disabled={lookupLoading}
              className="px-4 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition disabled:opacity-50">
              {lookupLoading ? '…' : 'Find'}
            </button>
          </div>

          {lookupResult ? (
            <div className="p-4 bg-zinc-50 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-brand-600">{lookupResult.name?.slice(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-zinc-800">{lookupResult.name}</p>
                  <p className="text-xs text-zinc-400">{lookupResult.email}</p>
                </div>
                <Link href={`/admin/users/${lookupResult.id}`}
                  className="ml-auto text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  Profile <ChevronRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'School', value: lookupResult.school || '—' },
                  { label: 'Plan', value: lookupResult.subscriptionTier },
                  { label: 'Streak', value: `${lookupResult.studyStreak ?? 0}d 🔥` },
                  { label: 'Sentiment', value: `${((lookupResult.sentimentBaseline ?? 0) * 100).toFixed(0)}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-lg p-2.5">
                    <span className="text-zinc-400">{label}</span>
                    <p className="font-medium text-zinc-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : lookup && !lookupLoading ? (
            <p className="text-sm text-zinc-400 text-center py-6">No user found for &ldquo;{lookup}&rdquo;</p>
          ) : (
            <div className="py-8 text-center">
              <User size={32} className="text-zinc-200 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Search to pull up a user&apos;s profile and activity timeline</p>
            </div>
          )}
        </div>
      </div>

      {/* Alert system */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={17} className="text-amber-500" />
            <h3 className="font-semibold text-zinc-800">Alert System</h3>
            {activeAlerts.length > 0 && (
              <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{activeAlerts.length} active</span>
            )}
          </div>
          <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
            {(['active', 'resolved'] as const).map(t => (
              <button key={t} onClick={() => setAlertTab(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition capitalize ${alertTab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {displayedAlerts.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">No {alertTab} alerts 🟢</p>
        ) : (
          <div className="space-y-3">
            {displayedAlerts.map((alert, i) => (
              <motion.div key={alert.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="flex items-start gap-4 p-4 bg-zinc-50 rounded-xl">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-zinc-800">{alert.title}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${severityColor[alert.severity]}`}>{alert.severity}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{alert.description}</p>
                  {alert.user && <p className="text-xs text-zinc-400 mt-1">{alert.user.name} · {alert.user.email}</p>}
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                    <Clock size={10} /> {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                {!alert.resolvedAt ? (
                  <button onClick={() => handleResolve(alert.id)}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium px-3 py-1.5 rounded-lg hover:bg-brand-50 transition shrink-0">
                    Resolve
                  </button>
                ) : (
                  <span className="text-xs text-emerald-600 font-medium shrink-0">Resolved</span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
