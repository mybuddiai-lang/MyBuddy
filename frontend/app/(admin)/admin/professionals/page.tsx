'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, MapPin, CheckCircle, XCircle, Search, Plus } from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  specialty: string;
  location: string;
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  rating: number;
  sessions: number;
}

const DUMMY: Professional[] = [
  { id: 'p1', name: 'Dr. Adaeze Obi', specialty: 'Clinical Psychology', location: 'Lagos, Nigeria', availability: 'AVAILABLE', status: 'APPROVED', rating: 4.9, sessions: 142 },
  { id: 'p2', name: 'Dr. Chukwuemeka Eze', specialty: 'Psychiatry', location: 'Abuja, Nigeria', availability: 'BUSY', status: 'APPROVED', rating: 4.7, sessions: 98 },
  { id: 'p3', name: 'Dr. Fatima Bello', specialty: 'Counselling', location: 'Kano, Nigeria', availability: 'AVAILABLE', status: 'PENDING', rating: 0, sessions: 0 },
  { id: 'p4', name: 'Dr. Ngozi Uche', specialty: 'Behavioural Therapy', location: 'Enugu, Nigeria', availability: 'OFFLINE', status: 'APPROVED', rating: 4.8, sessions: 76 },
  { id: 'p5', name: 'Dr. Tunde Adeyemi', specialty: 'Student Counselling', location: 'Ibadan, Nigeria', availability: 'AVAILABLE', status: 'PENDING', rating: 0, sessions: 0 },
  { id: 'p6', name: 'Dr. Amina Mohammed', specialty: 'Trauma Therapy', location: 'Kaduna, Nigeria', availability: 'AVAILABLE', status: 'REJECTED', rating: 0, sessions: 0 },
];

const availColor: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  BUSY: 'bg-amber-100 text-amber-700',
  OFFLINE: 'bg-zinc-100 text-zinc-500',
};
const statusColor: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-600',
};

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState(DUMMY);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const filtered = professionals.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.specialty.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || p.status === filter;
    return matchSearch && matchFilter;
  });

  const pending = professionals.filter(p => p.status === 'PENDING').length;
  const approved = professionals.filter(p => p.status === 'APPROVED').length;

  const handleApprove = (id: string) =>
    setProfessionals(prev => prev.map(p => p.id === id ? { ...p, status: 'APPROVED' as const, availability: 'AVAILABLE' as const } : p));

  const handleReject = (id: string) =>
    setProfessionals(prev => prev.map(p => p.id === id ? { ...p, status: 'REJECTED' as const } : p));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Professionals</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage counsellors, therapists, and support professionals</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 transition">
          <Plus size={15} /> Invite Professional
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: professionals.length, color: 'text-brand-600' },
          { label: 'Approved', value: approved, color: 'text-emerald-600' },
          { label: 'Pending Review', value: pending, color: 'text-amber-600' },
        ].map(({ label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm text-center">
            <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
            <p className="text-sm text-zinc-500">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or specialty…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition" />
        </div>
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Professional</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Location</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500">Availability</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500">Sessions</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500">Rating</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-sm text-zinc-400">No professionals found</td></tr>
              ) : filtered.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-zinc-50 transition">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-brand-600">{p.name.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-zinc-800">{p.name}</p>
                        <p className="text-xs text-zinc-400">{p.specialty}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <MapPin size={12} className="text-zinc-400" />
                      <span className="text-xs">{p.location}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${availColor[p.availability]}`}>{p.availability}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-zinc-800">{p.sessions}</td>
                  <td className="px-4 py-3.5 text-center">
                    {p.rating > 0 ? <span className="font-semibold text-zinc-800">★ {p.rating}</span> : <span className="text-zinc-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      {p.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleApprove(p.id)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition" title="Approve">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => handleReject(p.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition" title="Reject">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {p.status === 'APPROVED' && (
                        <button className="text-xs text-zinc-400 hover:text-brand-600 transition px-2 py-1 rounded-lg hover:bg-brand-50">Edit</button>
                      )}
                      {p.status === 'REJECTED' && (
                        <button onClick={() => handleApprove(p.id)}
                          className="text-xs text-emerald-600 hover:text-emerald-700 transition px-2 py-1 rounded-lg hover:bg-emerald-50">
                          Re-approve
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
