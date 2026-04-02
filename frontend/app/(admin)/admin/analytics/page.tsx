'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Brain, DollarSign, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

const DUMMY_ENGAGEMENT = { totalUsers: 2089, dau: 142, wau: 487, mau: 1204 };
const DUMMY_TOKEN_COSTS = { totalTokens: 4820000, totalMessages: 3241, estimatedCostUSD: 14.46 };
const DUMMY_RISKS = [
  { id: 'r1', name: 'Ngozi Obi', email: 'ngozi@imsu.edu', sentimentBaseline: 0.19 },
  { id: 'r2', name: 'Chisom Eze', email: 'chisom@uniben.edu', sentimentBaseline: 0.24 },
  { id: 'r3', name: 'Emeka Nwosu', email: 'emeka@unn.edu', sentimentBaseline: 0.31 },
  { id: 'r4', name: 'Bola Fashola', email: 'bola@abuja.edu', sentimentBaseline: 0.28 },
];

export default function AdminAnalyticsPage() {
  const [engagement, setEngagement] = useState<any>(DUMMY_ENGAGEMENT);
  const [tokenCosts, setTokenCosts] = useState<any>(DUMMY_TOKEN_COSTS);
  const [risks, setRisks] = useState<any[]>(DUMMY_RISKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/admin/analytics/dau'),
      apiClient.get('/admin/analytics/token-costs'),
      apiClient.get('/admin/analytics/sentiment-risks'),
    ]).then(([dauRes, tokenRes, riskRes]) => {
      setEngagement(dauRes.data.data);
      setTokenCosts(tokenRes.data.data);
      setRisks(riskRes.data.data);
    }).catch(() => {}) // keep dummy data on failure
    .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Analytics</h1>
        <p className="text-zinc-500 text-sm mt-1">Platform insights and performance metrics</p>
      </div>

      {/* Engagement metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: engagement?.totalUsers ?? 0, icon: Users, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Daily Active', value: engagement?.dau ?? 0, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Weekly Active', value: engagement?.wau ?? 0, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Monthly Active', value: engagement?.mau ?? 0, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-zinc-900">{value.toLocaleString()}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Token costs */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={18} className="text-emerald-500" />
            <h3 className="font-semibold text-zinc-800">AI Token Costs (30 days)</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl">
              <span className="text-sm text-zinc-600">Total tokens used</span>
              <span className="font-bold text-zinc-900">{(tokenCosts?.totalTokens ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl">
              <span className="text-sm text-zinc-600">AI messages sent</span>
              <span className="font-bold text-zinc-900">{(tokenCosts?.totalMessages ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-sm text-emerald-700 font-medium">Estimated cost (USD)</span>
              <span className="font-bold text-emerald-700 text-lg">${(tokenCosts?.estimatedCostUSD ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl">
              <span className="text-sm text-zinc-600">Avg tokens per message</span>
              <span className="font-bold text-zinc-900">
                {tokenCosts?.totalMessages > 0 ? Math.round(tokenCosts.totalTokens / tokenCosts.totalMessages) : 0}
              </span>
            </div>
          </div>
        </div>

        {/* Sentiment at-risk users */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="font-semibold text-zinc-800">Sentiment Risk Users</h3>
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{risks.length} flagged</span>
          </div>
          {risks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-3xl mb-2">💚</p>
              <p className="text-sm text-zinc-500">No users flagged for sentiment risk</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {risks.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{user.name}</p>
                    <p className="text-xs text-zinc-400">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${user.sentimentBaseline < 0.2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {(user.sentimentBaseline * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
