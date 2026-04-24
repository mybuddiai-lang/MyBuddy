'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, TrendingUp, Activity, Calendar } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

function generateDailyData(days: number) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dau: Math.floor(120 + Math.random() * 80 + Math.sin(i / 3) * 30),
      newUsers: Math.floor(8 + Math.random() * 20),
      sessions: Math.floor(250 + Math.random() * 150),
    });
  }
  return data;
}

const DUMMY_DAILY = generateDailyData(30);
const DUMMY_ENGAGEMENT = { totalUsers: 2089, dau: 142, wau: 487, mau: 1204 };
const DUMMY_RETENTION = [
  { cohort: 'Week 1', d1: 72, d7: 44, d30: 28 },
  { cohort: 'Week 2', d1: 68, d7: 41, d30: 25 },
  { cohort: 'Week 3', d1: 75, d7: 47, d30: 31 },
  { cohort: 'Week 4', d1: 70, d7: 43, d30: 27 },
];
const DUMMY_SCHOOLS = [
  { school: 'UNILAG', users: 412, dau: 38, engagement: 82 },
  { school: 'IMSU', users: 298, dau: 24, engagement: 71 },
  { school: 'UNIBEN', users: 267, dau: 19, engagement: 65 },
  { school: 'ABU Zaria', users: 201, dau: 15, engagement: 58 },
  { school: 'UNN', users: 188, dau: 13, engagement: 54 },
  { school: 'Others', users: 723, dau: 33, engagement: 42 },
];

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e4e4e7',
  borderRadius: '12px',
  padding: '8px 12px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
};

export default function AdminAnalyticsPage() {
  const [engagement, setEngagement] = useState(DUMMY_ENGAGEMENT);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(30);

  useEffect(() => {
    apiClient.get('/admin/analytics/dau')
      .then(r => setEngagement(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const slicedData = DUMMY_DAILY.slice(-range);
  const dauRate = engagement.totalUsers > 0 ? ((engagement.dau / engagement.totalUsers) * 100).toFixed(1) : '0';
  const wauRate = engagement.totalUsers > 0 ? ((engagement.wau / engagement.totalUsers) * 100).toFixed(1) : '0';
  const mauRate = engagement.totalUsers > 0 ? ((engagement.mau / engagement.totalUsers) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">User Analytics</h1>
          <p className="text-zinc-500 text-sm mt-1">Engagement, retention, and segmentation</p>
        </div>
        {loading && <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />}
      </div>

      {/* Top metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: engagement.totalUsers.toLocaleString(), sub: 'All time', icon: Users, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'DAU', value: engagement.dau.toLocaleString(), sub: `${dauRate}% of base`, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'WAU', value: engagement.wau.toLocaleString(), sub: `${wauRate}% of base`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'MAU', value: engagement.mau.toLocaleString(), sub: `${mauRate}% of base`, icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
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

      {/* DAU trend */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-zinc-800">Active Users Trend</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Daily active users over time</p>
          </div>
          <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
            {([7, 14, 30] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${range === r ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {r}d
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={slicedData}>
            <defs>
              <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={32} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="dau" stroke="#7c3aed" strokeWidth={2} fill="url(#dauGrad)" name="DAU" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New signups */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-zinc-800">New Signups</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Daily new registrations</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={slicedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="newUsers" fill="#10b981" radius={[4, 4, 0, 0]} name="New Users" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sessions */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-zinc-800">Daily Sessions</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Total sessions opened per day</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={slicedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2} dot={false} name="Sessions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Retention table */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="mb-5">
          <h3 className="font-semibold text-zinc-800">Cohort Retention</h3>
          <p className="text-xs text-zinc-400 mt-0.5">% of users returning at D1, D7, D30</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left text-xs text-zinc-500 font-medium pb-3">Cohort</th>
                <th className="text-center text-xs text-zinc-500 font-medium pb-3">D1 Retention</th>
                <th className="text-center text-xs text-zinc-500 font-medium pb-3">D7 Retention</th>
                <th className="text-center text-xs text-zinc-500 font-medium pb-3">D30 Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {DUMMY_RETENTION.map(row => (
                <tr key={row.cohort}>
                  <td className="py-3 font-medium text-zinc-800">{row.cohort}</td>
                  {[row.d1, row.d7, row.d30].map((val, i) => (
                    <td key={i} className="py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${val}%` }} />
                        </div>
                        <span className="font-semibold text-zinc-800">{val}%</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* School segmentation */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
        <div className="mb-5">
          <h3 className="font-semibold text-zinc-800">Segmentation by School</h3>
          <p className="text-xs text-zinc-400 mt-0.5">User distribution and activity by institution</p>
        </div>
        <div className="space-y-3">
          {DUMMY_SCHOOLS.map(s => (
            <div key={s.school} className="flex items-center gap-4">
              <div className="w-24 text-sm text-zinc-600 shrink-0">{s.school}</div>
              <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                <motion.div className="h-2 bg-brand-500 rounded-full" initial={{ width: 0 }}
                  animate={{ width: `${(s.users / 900) * 100}%` }} transition={{ duration: 0.8 }} />
              </div>
              <div className="text-sm font-semibold text-zinc-900 w-12 text-right">{s.users.toLocaleString()}</div>
              <div className="text-xs text-zinc-400 w-16 text-right">{s.dau} DAU</div>
              <div className={`text-xs font-medium px-2 py-0.5 rounded-full w-14 text-center ${s.engagement >= 70 ? 'bg-emerald-50 text-emerald-700' : s.engagement >= 55 ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>
                {s.engagement}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
