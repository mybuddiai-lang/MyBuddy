'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import type { UserRow, UserDetail } from '@/lib/types';
import { Search, X, ChevronLeft, ChevronRight, ShieldBan, ShieldCheck, Trash2, Globe } from 'lucide-react';
import { format } from 'date-fns';

const ROLE_OPTIONS = ['USER', 'SUPPORT', 'ANALYST', 'ADMIN', 'SUPER_ADMIN'];

const DEMO_USERS: UserRow[] = [
  { id: 'd1', name: 'Amara Obi', email: 'amara@example.com', role: 'USER', school: 'University of Lagos', department: 'Medicine', country: 'Nigeria', isBlocked: false, subscriptionTier: 'PREMIUM', sentimentBaseline: 0.72, studyStreak: 14, lastActiveAt: new Date().toISOString(), createdAt: '2026-03-01T10:00:00Z', _count: { chatMessages: 234, notes: 18, reminders: 42 } },
  { id: 'd2', name: 'Tunde Adeyemi', email: 'tunde@example.com', role: 'USER', school: 'Obafemi Awolowo University', department: 'Law', country: 'Nigeria', isBlocked: false, subscriptionTier: 'FREE', sentimentBaseline: 0.61, studyStreak: 5, lastActiveAt: new Date(Date.now() - 3600000).toISOString(), createdAt: '2026-03-05T08:00:00Z', _count: { chatMessages: 89, notes: 7, reminders: 12 } },
  { id: 'd3', name: 'Chisom Eze', email: 'chisom@example.com', role: 'USER', school: 'University of Ghana', department: 'Engineering', country: 'Ghana', isBlocked: false, subscriptionTier: 'PREMIUM', sentimentBaseline: 0.80, studyStreak: 21, lastActiveAt: new Date(Date.now() - 7200000).toISOString(), createdAt: '2026-02-20T12:00:00Z', _count: { chatMessages: 412, notes: 31, reminders: 67 } },
  { id: 'd4', name: 'Fatima Bello', email: 'fatima@example.com', role: 'USER', school: 'Bayero University Kano', department: 'Pharmacy', country: 'Nigeria', isBlocked: false, subscriptionTier: 'FREE', sentimentBaseline: 0.55, studyStreak: 0, lastActiveAt: new Date(Date.now() - 86400000).toISOString(), createdAt: '2026-03-12T09:00:00Z', _count: { chatMessages: 45, notes: 3, reminders: 8 } },
  { id: 'd5', name: 'Emeka Nwosu', email: 'emeka@example.com', role: 'USER', school: 'University of Nairobi', department: 'Medicine', country: 'Kenya', isBlocked: false, subscriptionTier: 'PREMIUM', sentimentBaseline: 0.68, studyStreak: 9, lastActiveAt: new Date(Date.now() - 3600000 * 2).toISOString(), createdAt: '2026-02-28T14:00:00Z', _count: { chatMessages: 178, notes: 14, reminders: 29 } },
  { id: 'd6', name: 'Ngozi Ike', email: 'ngozi@example.com', role: 'USER', school: 'University of Ibadan', department: 'Psychology', country: 'Nigeria', isBlocked: true, subscriptionTier: 'FREE', sentimentBaseline: 0.32, studyStreak: 0, lastActiveAt: new Date(Date.now() - 86400000 * 3).toISOString(), createdAt: '2026-03-18T11:00:00Z', _count: { chatMessages: 22, notes: 1, reminders: 3 } },
  { id: 'd7', name: 'Segun Alade', email: 'segun@example.com', role: 'SUPPORT', school: 'University of Lagos', department: 'Medicine', country: 'Nigeria', isBlocked: false, subscriptionTier: 'FREE', sentimentBaseline: 0.75, studyStreak: 3, lastActiveAt: new Date(Date.now() - 3600000 * 5).toISOString(), createdAt: '2026-01-15T08:00:00Z', _count: { chatMessages: 67, notes: 5, reminders: 11 } },
  { id: 'd8', name: 'Aisha Mohammed', email: 'aisha@example.com', role: 'USER', school: 'Ahmadu Bello University', department: 'Medicine', country: 'Nigeria', isBlocked: false, subscriptionTier: 'PREMIUM', sentimentBaseline: 0.79, studyStreak: 30, lastActiveAt: new Date().toISOString(), createdAt: '2026-01-20T10:00:00Z', _count: { chatMessages: 589, notes: 44, reminders: 98 } },
  { id: 'd9', name: 'Kwame Asante', email: 'kwame@example.com', role: 'USER', school: 'Kwame Nkrumah University', department: 'Engineering', country: 'Ghana', isBlocked: false, subscriptionTier: 'FREE', sentimentBaseline: 0.64, studyStreak: 7, lastActiveAt: new Date(Date.now() - 3600000 * 3).toISOString(), createdAt: '2026-02-10T09:00:00Z', _count: { chatMessages: 112, notes: 9, reminders: 17 } },
  { id: 'd10', name: 'Zara Kamara', email: 'zara@example.com', role: 'USER', school: 'University of Cape Town', department: 'Law', country: 'South Africa', isBlocked: false, subscriptionTier: 'PREMIUM', sentimentBaseline: 0.83, studyStreak: 18, lastActiveAt: new Date(Date.now() - 1800000).toISOString(), createdAt: '2026-02-14T13:00:00Z', _count: { chatMessages: 267, notes: 21, reminders: 45 } },
];

const TIER_COLORS: Record<string, string> = {
  FREE: 'text-zinc-400',
  PREMIUM: 'text-violet-400',
  INSTITUTIONAL: 'text-blue-400',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const adminUser = getUser();
  const isSuperAdmin = adminUser?.role === 'SUPER_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [newRole, setNewRole] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => usersApi.list(page, 20, search),
    refetchInterval: 60_000,
  });

  const hasRealUsers = ((rawData as { data: UserRow[] })?.data?.length ?? 0) > 0;
  const data = hasRealUsers
    ? (rawData as { data: UserRow[]; total: number; totalPages: number })
    : { data: DEMO_USERS, total: DEMO_USERS.length, totalPages: 1 };

  const { data: userDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-user-detail', selectedUser?.id],
    queryFn: () => usersApi.detail(selectedUser!.id),
    enabled: !!selectedUser?.id,
    refetchInterval: 60_000,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user-detail'] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: (id: string) => usersApi.block(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user-detail'] });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => usersApi.unblock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user-detail'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
    },
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: UserRow) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{row.name}</span>
          {row.isBlocked && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 font-medium">
              Blocked
            </span>
          )}
        </div>
      ),
    },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (row: UserRow) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
          {row.role}
        </span>
      ),
    },
    {
      key: 'subscriptionTier',
      header: 'Plan',
      render: (row: UserRow) => (
        <span className={`text-xs font-medium ${TIER_COLORS[row.subscriptionTier] ?? ''}`}>
          {row.subscriptionTier}
        </span>
      ),
    },
    { key: 'school', header: 'School' },
    {
      key: 'country',
      header: 'Country',
      render: (row: UserRow) => (
        <span className="flex items-center gap-1 text-zinc-400">
          {row.country ? (
            <>
              <Globe size={11} className="flex-shrink-0" />
              {row.country}
            </>
          ) : (
            '—'
          )}
        </span>
      ),
    },
    {
      key: 'lastActiveAt',
      header: 'Last Active',
      render: (row: UserRow) =>
        row.lastActiveAt ? format(new Date(row.lastActiveAt), 'MMM d, HH:mm') : '—',
    },
  ];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function closeModal() {
    setSelectedUser(null);
    setNewRole('');
    setDeleteConfirm('');
  }

  const detail = userDetail as UserDetail | undefined;

  return (
    <div>
      <PageHeader title="Users" description={`${data?.total ?? 0} total users`} />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, or school…"
            className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg font-medium transition-colors"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSearchInput('');
              setPage(1);
            }}
            className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <DataTable
              columns={columns as Parameters<typeof DataTable>[0]['columns']}
              data={
                (data?.data ?? []).map((u: UserRow) => ({
                  ...u,
                  // dim blocked rows
                  _isBlocked: u.isBlocked,
                })) as Record<string, unknown>[]
              }
              keyField="id"
              onRowClick={(row) => {
                setSelectedUser(row as unknown as UserDetail);
                setNewRole((row as unknown as UserRow).role);
              }}
            />
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-zinc-500">
                Page {page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 disabled:opacity-40 hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 disabled:opacity-40 hover:text-white transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white">User Detail</h2>
                {detail?.isBlocked && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400 font-medium">
                    Blocked
                  </span>
                )}
              </div>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : detail ? (
              <div className="p-5 space-y-5">
                {/* Blocked banner */}
                {detail.isBlocked && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-red-950/40 border border-red-900/60 rounded-lg text-sm text-red-400">
                    <ShieldBan size={15} />
                    This account is currently suspended and cannot log in.
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {[
                    { label: 'Name', value: detail.name },
                    { label: 'Email', value: detail.email },
                    { label: 'School', value: detail.school ?? '—' },
                    { label: 'Department', value: detail.department ?? '—' },
                    {
                      label: 'Country',
                      value: detail.country ?? '—',
                    },
                    {
                      label: 'Plan',
                      value: detail.subscriptionTier,
                      className: TIER_COLORS[detail.subscriptionTier] ?? '',
                    },
                    { label: 'Messages', value: String(detail._count.chatMessages) },
                    { label: 'Notes', value: String(detail._count.notes) },
                    {
                      label: 'Resilience',
                      value: detail.resilienceScore?.toFixed(1) ?? '—',
                    },
                    { label: 'Study Streak', value: `${detail.studyStreak} days` },
                  ].map(({ label, value, className }) => (
                    <div key={label}>
                      <p className="text-zinc-500 text-xs mb-0.5">{label}</p>
                      <p className={`text-white font-medium ${className ?? ''}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Role Change */}
                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-sm font-medium text-zinc-300 mb-2">Change Role</p>
                  <div className="flex gap-2">
                    <select
                      value={newRole || detail.role}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (newRole && newRole !== detail.role) {
                          roleMutation.mutate({ id: detail.id, role: newRole });
                        }
                      }}
                      disabled={roleMutation.isPending || !newRole || newRole === detail.role}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm rounded-lg font-medium transition-colors"
                    >
                      {roleMutation.isPending ? 'Saving…' : 'Update'}
                    </button>
                  </div>
                </div>

                {/* Block / Unblock / Delete actions */}
                <div className="border-t border-zinc-800 pt-4 space-y-3">
                  <p className="text-sm font-medium text-zinc-300">Account Actions</p>

                  <div className="flex flex-wrap gap-2">
                    {!detail.isBlocked ? (
                      <button
                        onClick={() => {
                          if (confirm(`Block ${detail.name}? They will be unable to log in.`)) {
                            blockMutation.mutate(detail.id);
                          }
                        }}
                        disabled={blockMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 text-red-400 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        <ShieldBan size={14} />
                        {blockMutation.isPending ? 'Blocking…' : 'Block User'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm(`Unblock ${detail.name}?`)) {
                            unblockMutation.mutate(detail.id);
                          }
                        }}
                        disabled={unblockMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-800/50 text-emerald-400 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        <ShieldCheck size={14} />
                        {unblockMutation.isPending ? 'Unblocking…' : 'Unblock User'}
                      </button>
                    )}
                  </div>

                  {/* Delete — SUPER_ADMIN only */}
                  {isSuperAdmin && (
                    <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
                      <p className="text-xs font-semibold text-red-400 mb-2">Danger Zone</p>
                      <p className="text-xs text-zinc-500 mb-3">
                        Permanently deletes this user and all their data. This cannot be undone. Type{' '}
                        <span className="font-mono text-zinc-300">{detail.email}</span> to confirm.
                      </p>
                      <input
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder={detail.email}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
                      />
                      <button
                        onClick={() => {
                          if (deleteConfirm === detail.email) {
                            deleteMutation.mutate(detail.id);
                          }
                        }}
                        disabled={deleteConfirm !== detail.email || deleteMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-sm rounded-lg font-medium transition-colors w-full justify-center"
                      >
                        <Trash2 size={14} />
                        {deleteMutation.isPending ? 'Deleting…' : 'Permanently Delete'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                {detail.recentActivity?.length > 0 && (
                  <div className="border-t border-zinc-800 pt-4">
                    <p className="text-sm font-medium text-zinc-300 mb-2">Recent Activity</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {detail.recentActivity
                        .slice(0, 15)
                        .map(
                          (
                            ev: { eventType: string; createdAt: string },
                            i: number,
                          ) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-zinc-400 font-mono bg-zinc-800 px-1.5 py-0.5 rounded truncate max-w-[180px]">
                                {ev.eventType}
                              </span>
                              <span className="text-zinc-600 ml-2 flex-shrink-0">
                                {format(new Date(ev.createdAt), 'MMM d, HH:mm')}
                              </span>
                            </div>
                          ),
                        )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
