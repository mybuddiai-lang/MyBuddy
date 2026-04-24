'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminsApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import PageHeader from '@/components/PageHeader';
import type { AdminMember } from '@/lib/types';
import { Plus, X, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-violet-500/15 text-violet-400',
  ADMIN: 'bg-blue-500/15 text-blue-400',
  ANALYST: 'bg-emerald-500/15 text-emerald-400',
  SUPPORT: 'bg-amber-500/15 text-amber-400',
};

const CREATABLE_ROLES = ['ADMIN', 'SUPPORT', 'ANALYST'];

export default function AdminsPage() {
  const qc = useQueryClient();
  const currentUser = getUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ADMIN' });
  const [formError, setFormError] = useState('');

  const { data: admins, isLoading } = useQuery({
    queryKey: ['admins-list'],
    queryFn: adminsApi.list,
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: adminsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins-list'] });
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'ADMIN' });
      setFormError('');
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setFormError(msg || 'Failed to create admin user');
    },
  });

  const members = (admins as AdminMember[]) ?? [];

  return (
    <div>
      <PageHeader
        title="Admin Users"
        description={`${members.length} admin team member${members.length !== 1 ? 's' : ''}`}
        action={
          isSuperAdmin ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg font-medium transition-colors"
            >
              <Plus size={14} />
              Invite Admin
            </button>
          ) : undefined
        }
      />

      {/* Info banner */}
      <div className="flex items-start gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl mb-5 text-sm text-zinc-400">
        <ShieldCheck size={15} className="text-violet-400 mt-0.5 flex-shrink-0" />
        <span>
          Only <span className="text-violet-400 font-medium">SUPER_ADMIN</span> users can invite
          new admin members. Admins have full platform access; Analysts and Support have read-only
          access.
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
              <ShieldCheck size={32} className="mb-3 text-zinc-700" />
              <p>No admin users yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    {['Member', 'Email', 'Role', 'Last Active', 'Joined'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr
                      key={m.id}
                      className={`border-b border-zinc-800/50 last:border-0 ${
                        m.isBlocked ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-900/50 flex items-center justify-center text-violet-300 text-xs font-bold flex-shrink-0">
                            {m.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">{m.name}</p>
                            {m.id === currentUser?.id && (
                              <span className="text-xs text-zinc-500">(you)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{m.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            ROLE_COLORS[m.role] ?? 'bg-zinc-700 text-zinc-300'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {m.lastActiveAt
                          ? formatDistanceToNow(new Date(m.lastActiveAt), { addSuffix: true })
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {format(new Date(m.createdAt), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Admin Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-white">Invite Admin User</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormError('');
                }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError('');
                if (form.password.length < 8) {
                  setFormError('Password must be at least 8 characters');
                  return;
                }
                createMutation.mutate(form);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="jane@buddi.com"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Temporary Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Min 8 characters"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {CREATABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-600 mt-1.5">
                  ADMIN: full access · ANALYST: read-only analytics · SUPPORT: user lookup only
                </p>
              </div>

              {formError && (
                <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                {createMutation.isPending ? 'Creating…' : 'Create Admin Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
