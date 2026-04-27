'use client';
import { useState } from 'react';
import MetricCard from '@/components/MetricCard';
import PageHeader from '@/components/PageHeader';
import { Shield, UserCheck, Users, UserX, Trash2, Download } from 'lucide-react';

// Demo compliance data — replace with real API when backend endpoints are ready
const DEMO = {
  consentGiven: 318,
  studyParticipants: 142,
  optOutCount: 23,
  deletionRequests: 7,
  consentRate: '87.1',
  lastAuditDate: '2026-04-01',
};

const DEMO_DELETION_LOG = [
  { id: 'DR-001', requestedAt: '2026-04-22', status: 'Completed', method: 'In-app request' },
  { id: 'DR-002', requestedAt: '2026-04-18', status: 'Completed', method: 'In-app request' },
  { id: 'DR-003', requestedAt: '2026-04-15', status: 'Pending', method: 'Email request' },
  { id: 'DR-004', requestedAt: '2026-04-10', status: 'Completed', method: 'In-app request' },
  { id: 'DR-005', requestedAt: '2026-04-05', status: 'Completed', method: 'In-app request' },
  { id: 'DR-006', requestedAt: '2026-03-28', status: 'Completed', method: 'In-app request' },
  { id: 'DR-007', requestedAt: '2026-03-20', status: 'Completed', method: 'Email request' },
];

const STATUS_COLORS: Record<string, string> = {
  Completed: 'bg-emerald-500/15 text-emerald-400',
  Pending: 'bg-amber-500/15 text-amber-400',
};

function downloadCSV() {
  const rows = [
    ['Metric', 'Value'],
    ['Users Who Gave Consent', DEMO.consentGiven],
    ['Study Participants', DEMO.studyParticipants],
    ['Opt-Out Count', DEMO.optOutCount],
    ['Data Deletion Requests', DEMO.deletionRequests],
    ['Consent Rate', `${DEMO.consentRate}%`],
    ['Last Audit Date', DEMO.lastAuditDate],
    [],
    ['Deletion Request ID', 'Requested At', 'Status', 'Method'],
    ...DEMO_DELETION_LOG.map((r) => [r.id, r.requestedAt, r.status, r.method]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buddi-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CompliancePage() {
  const [tab, setTab] = useState<'overview' | 'deletions'>('overview');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="Privacy consent, study participation, and data deletion tracking. Exportable for audits."
        action={
          <button
            onClick={downloadCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-lg font-medium transition-colors border border-zinc-700"
          >
            <Download size={14} /> Export CSV
          </button>
        }
      />

      {/* Privacy Notice */}
      <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl px-4 py-3 text-sm text-blue-300 flex items-start gap-2">
        <Shield size={16} className="mt-0.5 flex-shrink-0" />
        <span>
          All data is anonymized. No individual users are identified in this view.
          Aligns with GDPR, NDPR, and internal Buddi privacy policy. Last audit: <strong>{DEMO.lastAuditDate}</strong>.
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Users Who Gave Consent"
          value={DEMO.consentGiven.toLocaleString()}
          icon={UserCheck}
          color="green"
        />
        <MetricCard
          label="Study Participants"
          value={DEMO.studyParticipants.toLocaleString()}
          icon={Users}
          color="blue"
        />
        <MetricCard
          label="Opt-Out Count"
          value={DEMO.optOutCount.toLocaleString()}
          icon={UserX}
          color="amber"
        />
        <MetricCard
          label="Deletion Requests"
          value={DEMO.deletionRequests.toLocaleString()}
          icon={Trash2}
          color="amber"
        />
      </div>

      {/* Consent Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-1">Consent Rate</p>
          <p className="text-3xl font-bold text-white">{DEMO.consentRate}%</p>
          <p className="text-xs text-zinc-600 mt-1">
            {DEMO.consentGiven} of {DEMO.consentGiven + DEMO.optOutCount} users
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-1">Study Participation Rate</p>
          <p className="text-3xl font-bold text-white">
            {((DEMO.studyParticipants / DEMO.consentGiven) * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            {DEMO.studyParticipants} of {DEMO.consentGiven} consented users
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-1">Deletion Completion Rate</p>
          <p className="text-3xl font-bold text-white">
            {(
              (DEMO_DELETION_LOG.filter((r) => r.status === 'Completed').length /
                DEMO_DELETION_LOG.length) *
              100
            ).toFixed(0)}
            %
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            {DEMO_DELETION_LOG.filter((r) => r.status === 'Completed').length} of{' '}
            {DEMO_DELETION_LOG.length} requests processed
          </p>
        </div>
      </div>

      {/* Deletion Requests Log */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-300">Data Deletion Requests</h2>
            <p className="text-xs text-zinc-500 mt-0.5">No user names or emails are stored here</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 text-xs text-zinc-500 font-medium uppercase tracking-wide">Request ID</th>
                <th className="text-left py-2 text-xs text-zinc-500 font-medium uppercase tracking-wide">Date</th>
                <th className="text-left py-2 text-xs text-zinc-500 font-medium uppercase tracking-wide">Status</th>
                <th className="text-left py-2 text-xs text-zinc-500 font-medium uppercase tracking-wide">Method</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_DELETION_LOG.map((row) => (
                <tr key={row.id} className="border-b border-zinc-800/50 last:border-0">
                  <td className="py-2.5 text-zinc-400 font-mono text-xs">{row.id}</td>
                  <td className="py-2.5 text-zinc-300">{row.requestedAt}</td>
                  <td className="py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[row.status] ?? ''}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-zinc-400">{row.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regulations Note */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Regulatory Alignment</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'GDPR', note: 'EU General Data Protection Regulation — data minimization, right to erasure' },
            { label: 'NDPR', note: 'Nigeria Data Protection Regulation — consent-based processing, lawful basis' },
            { label: 'Buddi Privacy Policy', note: 'No PII in analytics, ≥10 user cohort minimum, anonymized assessments' },
          ].map((r) => (
            <div key={r.label} className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-zinc-300 mb-1">{r.label}</p>
              <p className="text-xs text-zinc-500">{r.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
