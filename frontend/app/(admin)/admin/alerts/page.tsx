'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface Alert {
  id: string; type: string; severity: string; title: string;
  description?: string; resolvedAt?: string; createdAt: string;
  user?: { id: string; name: string; email: string };
}

const severityStyle: Record<string, string> = {
  LOW: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
};

const DUMMY_ALERTS: Alert[] = [
  { id: 'al1', type: 'BURNOUT_RISK', severity: 'HIGH', title: 'Burnout risk: Ngozi Obi', description: 'Sentiment baseline dropped to 19% over 7 days', createdAt: new Date(Date.now() - 3600000).toISOString(), user: { id: 'u8', name: 'Ngozi Obi', email: 'ngozi@imsu.edu' } },
  { id: 'al2', type: 'BURNOUT_RISK', severity: 'HIGH', title: 'Burnout risk: Chisom Eze', description: 'Sentiment baseline dropped to 24%', createdAt: new Date(Date.now() - 7200000).toISOString(), user: { id: 'u3', name: 'Chisom Eze', email: 'chisom@uniben.edu' } },
  { id: 'al3', type: 'BURNOUT_RISK', severity: 'MEDIUM', title: 'Burnout risk: Emeka Nwosu', description: 'Sentiment baseline at 31% — below threshold', createdAt: new Date(Date.now() - 86400000).toISOString(), user: { id: 'u4', name: 'Emeka Nwosu', email: 'emeka@unn.edu' } },
  { id: 'al4', type: 'BURNOUT_RISK', severity: 'MEDIUM', title: 'Burnout risk: Bola Fashola', description: 'Sentiment baseline at 28%', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), user: { id: 'u6', name: 'Bola Fashola', email: 'bola@abuja.edu' } },
];

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(DUMMY_ALERTS);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async (resolved: boolean) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/alerts', { params: { resolved } });
      setAlerts(res.data.data);
    } catch {} // keep dummy data on failure
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAlerts(showResolved); }, [showResolved]);

  const handleResolve = async (id: string) => {
    const previous = alerts;
    setAlerts(prev => prev.filter(a => a.id !== id));
    try {
      await apiClient.post(`/admin/alerts/${id}/resolve`);
    } catch {
      setAlerts(previous); // rollback on failure
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Alerts</h1>
          <p className="text-zinc-500 text-sm mt-1">{alerts.length} {showResolved ? 'resolved' : 'active'} alerts</p>
        </div>
        <div className="flex bg-zinc-100 rounded-xl p-1">
          {['Active', 'Resolved'].map((tab, i) => (
            <button
              key={tab}
              onClick={() => setShowResolved(i === 1)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${(i === 1) === showResolved ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-zinc-600 font-medium">No {showResolved ? 'resolved' : 'active'} alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className={`bg-white rounded-2xl p-4 border ${severityStyle[alert.severity]} shadow-sm`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 border">{alert.severity}</span>
                    </div>
                    {alert.description && <p className="text-xs mt-0.5 opacity-80">{alert.description}</p>}
                    {alert.user && (
                      <p className="text-xs mt-1 opacity-70">User: {alert.user.name} ({alert.user.email})</p>
                    )}
                    <p className="text-xs mt-1 opacity-60 flex items-center gap-1">
                      <Clock size={10} /> {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!alert.resolvedAt && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="shrink-0 flex items-center gap-1.5 text-xs bg-white/80 hover:bg-white border border-current px-3 py-1.5 rounded-lg font-medium transition"
                  >
                    <Check size={12} /> Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
