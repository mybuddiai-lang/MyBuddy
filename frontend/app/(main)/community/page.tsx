'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Hash, Lock, ChevronRight, MessageCircle } from 'lucide-react';

interface Pod {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isPublic: boolean;
  subject: string;
  lastActivity: string;
  isMember: boolean;
}

const MOCK_PODS: Pod[] = [
  { id: '1', name: 'MBBS Finals 2026', description: 'Study group for final year medical students', memberCount: 48, isPublic: true, subject: 'Medicine', lastActivity: '2m ago', isMember: true },
  { id: '2', name: 'Anatomy Nerds', description: 'Anatomy deep dives, diagrams, and mnemonics', memberCount: 23, isPublic: true, subject: 'Anatomy', lastActivity: '1h ago', isMember: true },
  { id: '3', name: 'Bar Exam Prep', description: 'Nigerian Bar 2026 candidates', memberCount: 67, isPublic: true, subject: 'Law', lastActivity: '15m ago', isMember: false },
  { id: '4', name: 'Engineering Survivors', description: 'For engineering students surviving thermodynamics', memberCount: 31, isPublic: true, subject: 'Engineering', lastActivity: '3h ago', isMember: false },
];

export default function CommunityPage() {
  const [pods, setPods] = useState(MOCK_PODS);
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
  const [showCreate, setShowCreate] = useState(false);
  const [newPodName, setNewPodName] = useState('');

  const myPods = pods.filter(p => p.isMember);
  const discoverPods = pods.filter(p => !p.isMember);

  const handleJoin = (id: string) => {
    setPods(prev => prev.map(p => p.id === id ? { ...p, isMember: true, memberCount: p.memberCount + 1 } : p));
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Community</h1>
          <p className="text-sm text-zinc-500">Study together, thrive together</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-soft hover:bg-brand-600 transition"
        >
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-100 rounded-xl p-1 gap-1">
        {(['my', 'discover'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            {tab === 'my' ? `My Pods (${myPods.length})` : 'Discover'}
          </button>
        ))}
      </div>

      {/* Pod list */}
      <div className="space-y-3">
        {(activeTab === 'my' ? myPods : discoverPods).map((pod, i) => (
          <motion.div
            key={pod.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-card"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                {pod.isPublic ? <Hash size={18} className="text-brand-600" /> : <Lock size={18} className="text-brand-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-zinc-800 text-sm truncate">{pod.name}</p>
                  <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full shrink-0">{pod.subject}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{pod.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Users size={10} /> {pod.memberCount} members
                  </span>
                  <span className="text-xs text-zinc-300">·</span>
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <MessageCircle size={10} /> {pod.lastActivity}
                  </span>
                </div>
              </div>
              {pod.isMember ? (
                <button className="text-zinc-300 hover:text-zinc-500 shrink-0 mt-1">
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={() => handleJoin(pod.id)}
                  className="text-xs bg-brand-50 text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg font-medium hover:bg-brand-100 transition shrink-0"
                >
                  Join
                </button>
              )}
            </div>
          </motion.div>
        ))}

        {(activeTab === 'my' ? myPods : discoverPods).length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-zinc-600 font-medium">{activeTab === 'my' ? 'No pods yet' : 'No pods to discover'}</p>
            <p className="text-zinc-400 text-sm mt-1">{activeTab === 'my' ? 'Join or create a study pod' : 'Check back later'}</p>
          </div>
        )}
      </div>

      {/* Create pod modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowCreate(false)}>
          <div className="w-full bg-white rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto" />
            <h2 className="text-lg font-bold text-zinc-900">Create Study Pod</h2>
            <input
              type="text"
              value={newPodName}
              onChange={e => setNewPodName(e.target.value)}
              placeholder="Pod name (e.g. MBBS Finals 2026)"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-3 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">Cancel</button>
              <button
                onClick={() => { setShowCreate(false); setNewPodName(''); }}
                className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition shadow-soft"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
