'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronRight, Flame, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';

interface User {
  id: string; name: string; email: string; school?: string;
  subscriptionTier: string; studyStreak: number; sentimentBaseline: number;
  lastActiveAt?: string; createdAt: string;
}

const tierBadge: Record<string, string> = {
  FREE: 'bg-zinc-100 text-zinc-600',
  PREMIUM: 'bg-amber-100 text-amber-700',
  INSTITUTIONAL: 'bg-purple-100 text-purple-700',
};

const DUMMY_USERS: User[] = [
  { id: 'u1', name: 'Amara Okafor', email: 'amara@unilag.edu', school: 'University of Lagos', subscriptionTier: 'PREMIUM', studyStreak: 14, sentimentBaseline: 0.72, lastActiveAt: new Date().toISOString(), createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'u2', name: 'Tobi Adeyemi', email: 'tobi@obafemi.edu', school: 'Obafemi Awolowo University', subscriptionTier: 'FREE', studyStreak: 7, sentimentBaseline: 0.58, lastActiveAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: 'u3', name: 'Chisom Eze', email: 'chisom@uniben.edu', school: 'University of Benin', subscriptionTier: 'FREE', studyStreak: 3, sentimentBaseline: 0.24, lastActiveAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: 'u4', name: 'Emeka Nwosu', email: 'emeka@unn.edu', school: 'University of Nigeria Nsukka', subscriptionTier: 'PREMIUM', studyStreak: 21, sentimentBaseline: 0.31, lastActiveAt: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: 'u5', name: 'Lara Kuti', email: 'lara@lasuth.edu', school: 'LASUTH', subscriptionTier: 'INSTITUTIONAL', studyStreak: 30, sentimentBaseline: 0.81, lastActiveAt: new Date(Date.now() - 1800000).toISOString(), createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: 'u6', name: 'Bola Fashola', email: 'bola@abuja.edu', school: 'ABU Zaria', subscriptionTier: 'FREE', studyStreak: 1, sentimentBaseline: 0.45, lastActiveAt: new Date(Date.now() - 48 * 3600000).toISOString(), createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'u7', name: 'Ife Adeleke', email: 'ife@covenant.edu', school: 'Covenant University', subscriptionTier: 'PREMIUM', studyStreak: 8, sentimentBaseline: 0.69, lastActiveAt: new Date(Date.now() - 3 * 3600000).toISOString(), createdAt: new Date(Date.now() - 50 * 86400000).toISOString() },
  { id: 'u8', name: 'Ngozi Obi', email: 'ngozi@imsu.edu', school: 'Imo State University', subscriptionTier: 'FREE', studyStreak: 0, sentimentBaseline: 0.19, lastActiveAt: new Date(Date.now() - 5 * 86400000).toISOString(), createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(DUMMY_USERS);
  const [total, setTotal] = useState(DUMMY_USERS.length);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async (q: string, pg: number) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/users', { params: { page: pg, limit: 20, search: q || undefined } });
      setUsers(res.data.data.users);
      setTotal(res.data.data.total);
    } catch {} // keep dummy data on failure
    setLoading(false);
  };

  useEffect(() => { fetchUsers(search, page); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(search, 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Users</h1>
          <p className="text-zinc-500 text-sm mt-1">{total.toLocaleString()} registered students</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
        />
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              {['Student', 'School', 'Plan', 'Streak', 'Sentiment', 'Last Active'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-400 text-sm">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-400 text-sm">No users found</td></tr>
            ) : users.map(user => (
              <tr
                key={user.id}
                onClick={() => router.push(`/admin/users/${user.id}`)}
                className="hover:bg-zinc-50 cursor-pointer transition"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{user.name}</p>
                    <p className="text-xs text-zinc-400">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600">{user.school || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tierBadge[user.subscriptionTier]}`}>
                    {user.subscriptionTier}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm text-orange-600">
                    <Flame size={13} /> {user.studyStreak}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-zinc-100 rounded-full">
                      <div
                        className={`h-1.5 rounded-full ${user.sentimentBaseline < 0.3 ? 'bg-red-400' : user.sentimentBaseline < 0.5 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${(user.sentimentBaseline * 100).toFixed(0)}%` }}
                      />
                    </div>
                    {user.sentimentBaseline < 0.3 && <AlertTriangle size={12} className="text-red-500" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-zinc-100 flex items-center justify-between">
            <p className="text-xs text-zinc-500">Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setPage(p => p - 1); fetchUsers(search, page - 1); }}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg disabled:opacity-50 hover:bg-zinc-50 transition"
              >Previous</button>
              <button
                onClick={() => { setPage(p => p + 1); fetchUsers(search, page + 1); }}
                disabled={page * 20 >= total}
                className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg disabled:opacity-50 hover:bg-zinc-50 transition"
              >Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
