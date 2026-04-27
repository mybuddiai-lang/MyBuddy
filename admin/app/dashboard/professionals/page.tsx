'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { professionalsApi } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import type { Professional } from '@/lib/types';
import { Plus, X, Check, Trash2, Ban, ShieldCheck } from 'lucide-react';

type ProfType = 'Psychologist' | 'Psychiatrist' | 'Therapist' | 'Counselor';

const DEMO_PROFESSIONALS: Professional[] = [
  { id: 'd1', name: 'Dr. Adaeze Okonkwo', email: 'adaeze@example.com', specialty: 'Psychologist', type: 'Psychologist', location: 'Lagos, Nigeria', available: true, approved: true, verificationStatus: 'Verified', bio: null, createdAt: '2026-03-10T00:00:00Z' },
  { id: 'd2', name: 'Dr. Kwame Mensah', email: 'kwame@example.com', specialty: 'Psychiatrist', type: 'Psychiatrist', location: 'Accra, Ghana', available: true, approved: true, verificationStatus: 'Verified', bio: null, createdAt: '2026-03-14T00:00:00Z' },
  { id: 'd3', name: 'Ngozi Eze', email: 'ngozi@example.com', specialty: 'Therapist', type: 'Therapist', location: 'Abuja, Nigeria', available: false, approved: true, verificationStatus: 'Pending', bio: null, createdAt: '2026-04-01T00:00:00Z' },
  { id: 'd4', name: 'Dr. Amani Waweru', email: 'amani@example.com', specialty: 'Counselor', type: 'Counselor', location: 'Nairobi, Kenya', available: true, approved: false, verificationStatus: 'Unverified', bio: null, createdAt: '2026-04-15T00:00:00Z' },
  { id: 'd5', name: 'Dr. Fatou Diallo', email: 'fatou@example.com', specialty: 'Psychologist', type: 'Psychologist', location: 'Dakar, Senegal', available: true, approved: true, verificationStatus: 'Verified', bio: null, createdAt: '2026-04-20T00:00:00Z' },
];

const VERIFICATION_COLORS: Record<string, string> = {
  Verified: 'bg-emerald-500/15 text-emerald-400',
  Pending: 'bg-amber-500/15 text-amber-400',
  Unverified: 'bg-zinc-700/50 text-zinc-400',
};

const PROF_TYPES: ProfType[] = ['Psychologist', 'Psychiatrist', 'Therapist', 'Counselor'];

export default function ProfessionalsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', specialty: '', type: '' as ProfType | '', location: '', bio: '' });

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['professionals', page],
    queryFn: () => professionalsApi.list(page, 20),
  });

  const hasReal = ((rawData as { data: Professional[]; total: number })?.total ?? 0) > 0;
  const data = hasReal
    ? rawData as { data: Professional[]; total: number; totalPages: number }
    : { data: DEMO_PROFESSIONALS, total: DEMO_PROFESSIONALS.length, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => professionalsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['professionals'] });
      setShowAdd(false);
      setForm({ name: '', email: '', specialty: '', type: '', location: '', bio: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      professionalsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professionals'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => professionalsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professionals'] }),
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: Record<string, unknown>) => (
        <span className="font-medium text-white">{row.name as string}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: Record<string, unknown>) => (
        <span className="text-zinc-300">{(row.type as string) || (row.specialty as string) || '—'}</span>
      ),
    },
    { key: 'location', header: 'Location' },
    {
      key: 'available',
      header: 'Availability',
      render: (row: Record<string, unknown>) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.available ? 'bg-blue-500/15 text-blue-400' : 'bg-zinc-700/50 text-zinc-400'}`}>
          {row.available ? 'Online' : 'Offline'}
        </span>
      ),
    },
    {
      key: 'verificationStatus',
      header: 'Verification',
      render: (row: Record<string, unknown>) => {
        const status = (row.verificationStatus as string) ?? (row.approved ? 'Verified' : 'Pending');
        return (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${VERIFICATION_COLORS[status] ?? ''}`}>
            {status}
          </span>
        );
      },
    },
    {
      key: 'approved',
      header: 'Status',
      render: (row: Record<string, unknown>) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.approved ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
          {row.approved ? 'Approved' : 'Pending'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Record<string, unknown>) => (
        <div className="flex items-center gap-1.5">
          {!(row.approved as boolean) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateMutation.mutate({ id: row.id as string, data: { approved: true, verificationStatus: 'Verified' } });
              }}
              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              title="Approve"
            >
              <Check size={13} />
            </button>
          )}
          {!!(row.approved as boolean) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateMutation.mutate({ id: row.id as string, data: { approved: false } });
              }}
              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
              title="Suspend"
            >
              <Ban size={13} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateMutation.mutate({ id: row.id as string, data: { verificationStatus: 'Verified' } });
            }}
            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
            title="Mark Verified"
          >
            <ShieldCheck size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Remove this professional?')) {
                deleteMutation.mutate(row.id as string);
              }
            }}
            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Professionals"
        description={`${data?.total ?? 0} registered professionals · Neutral presentation only`}
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg font-medium transition-colors"
          >
            <Plus size={14} /> Add Professional
          </button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(data?.data ?? []) as unknown as Record<string, unknown>[]}
          keyField="id"
        />
      )}

      {/* Add Professional Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-white">Add Professional</h2>
              <button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({ ...form, specialty: form.type || form.specialty });
              }}
              className="p-5 space-y-3"
            >
              {(
                [
                  { key: 'name', label: 'Full Name', type: 'text', required: true },
                  { key: 'email', label: 'Email', type: 'email', required: true },
                  { key: 'location', label: 'Location', type: 'text', required: false },
                ] as const
              ).map(({ key, label, type, required }) => (
                <div key={key}>
                  <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required={required}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ProfType }))}
                  required
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Select type…</option>
                  {PROF_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                {createMutation.isPending ? 'Adding…' : 'Add Professional'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
