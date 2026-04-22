'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Brain, AlertTriangle, TrendingUp, DollarSign, Activity, FileText, Zap, Hash, Trash2, Shield, ShieldOff, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface DashboardData {
  engagement: { dau: number; wau: number; mau: number; totalUsers: number };
  sentimentRisksCount: number;
  tokenCosts: { totalTokens: number; totalMessages: number; estimatedCostUSD: number };
  recentAlerts: Array<{ id: string; title: string; severity: string; createdAt: string }>;
  noteStats: Array<{ processingStatus: string; _count: number }>;
}

interface AdminUser {
  id: string; name: string; email: string; school?: string;
  subscriptionTier: string; studyStreak: number; sentimentBaseline: number;
  lastActiveAt?: string; createdAt: string; role?: string;
}

interface AdminCommunity {
  id: string; name: string; subjectFilter?: string; memberCount: number;
  isPublic: boolean; createdAt: string;
  _count: { posts: number; members: number };
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

type AdminTab = 'overview' | 'users' | 'communities';

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<DashboardData>(DUMMY_DATA);
  const [loading, setLoading] = useState(true);

  // Users tab
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Communities tab
  const [communities, setCommunities] = useState<AdminCommunity[]>([]);
  const [commLoading, setCommLoading] = useState(false);

  useEffect(() => {
    apiClient.get('/admin/dashboard')
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'users' && users.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsersLoading(true);
      apiClient.get('/admin/users', { params: { limit: 50 } })
        .then(r => setUsers(r.data.data?.users ?? []))
        .catch(() => {})
        .finally(() => setUsersLoading(false));
    }
    if (tab === 'communities' && communities.length === 0) {
      setCommLoading(true);
      apiClient.get('/admin/communities')
        .then(r => setCommunities(r.data.data ?? []))
        .catch(() => {})
        .finally(() => setCommLoading(false));
    }
  }, [tab]);

  const handleToggleAdmin = async (u: AdminUser) => {
    const newRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await apiClient.patch(`/admin/users/${u.id}/role`, { role: newRole });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
      toast.success(`${u.name} is now ${newRole === 'ADMIN' ? 'an admin' : 'a regular user'}`);
    } catch {
      toast.error('Could not update role');
    }
  };

  const handleDeleteCommunity = async (comm: AdminCommunity) => {
    if (!confirm(`Delete "${comm.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/admin/communities/${comm.id}`);
      setCommunities(prev => prev.filter(c => c.id !== comm.id));
      toast.success('Community deleted');
    } catch {
      toast.error('Could not delete community');
    }
  };

  const noteStatusMap = Object.fromEntries((data.noteStats || []).map(s => [s.processingStatus, s._count]));
  const totalNotes = data.noteStats.reduce((a, s) => a + s._count, 0);

  const filteredUsers = users.filter(u =>
    !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Admin Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Platform management</p>
        </div>
        {loading && <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
        {(['overview', 'users', 'communities'] as AdminTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition capitalize ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Total Users', value: data.engagement.totalUsers.toLocaleString(), sub: `${data.engagement.dau} active today`, color: 'text-brand-600', bg: 'bg-brand-50' },
              { icon: Activity, label: 'Daily Active', value: data.engagement.dau.toLocaleString(), sub: `${data.engagement.wau} this week`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { icon: AlertTriangle, label: 'At-Risk Users', value: data.sentimentRisksCount, sub: 'Low sentiment detected', color: 'text-amber-600', bg: 'bg-amber-50' },
              { icon: DollarSign, label: 'AI Spend (30d)', value: `$${data.tokenCosts.estimatedCostUSD.toFixed(2)}`, sub: `${(data.tokenCosts.totalTokens / 1_000_000).toFixed(2)}M tokens`, color: 'text-violet-600', bg: 'bg-violet-50' },
            ].map(({ icon: Icon, label, value, sub, color, bg }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
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
                      <motion.div className="h-2 bg-brand-500 rounded-full" initial={{ width: 0 }}
                        animate={{ width: `${max > 0 ? Math.min((value / max) * 100, 100) : 0}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }} />
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
                  <motion.div key={alert.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
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
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
            <span className="text-xs text-zinc-400 shrink-0">{filteredUsers.length} users</span>
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm divide-y divide-zinc-50">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-10">No users found</p>
              ) : filteredUsers.map((u, i) => (
                <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-brand-600">{u.name?.slice(0, 2).toUpperCase() || 'U'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 truncate">{u.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.role === 'ADMIN' && (
                      <span className="text-[10px] font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">ADMIN</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${u.subscriptionTier === 'PREMIUM' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {u.subscriptionTier}
                    </span>
                    <button
                      onClick={() => handleToggleAdmin(u)}
                      title={u.role === 'ADMIN' ? 'Revoke admin' : 'Make admin'}
                      className={`p-1.5 rounded-lg transition ${u.role === 'ADMIN' ? 'text-brand-600 bg-brand-50 hover:bg-red-50 hover:text-red-500' : 'text-zinc-400 hover:text-brand-600 hover:bg-brand-50'}`}
                    >
                      {u.role === 'ADMIN' ? <ShieldOff size={14} /> : <Shield size={14} />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMMUNITIES TAB ── */}
      {tab === 'communities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">{communities.length} communities</p>
          </div>

          {commLoading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm divide-y divide-zinc-50">
              {communities.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-10">No communities yet</p>
              ) : communities.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Hash size={15} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 truncate">{c.name}</p>
                    <p className="text-xs text-zinc-400">
                      {c._count?.members ?? c.memberCount} members · {c._count?.posts ?? 0} posts · {c.subjectFilter || 'General'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.isPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                      {c.isPublic ? 'Public' : 'Private'}
                    </span>
                    <button
                      onClick={() => handleDeleteCommunity(c)}
                      className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition"
                      title="Delete community"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
