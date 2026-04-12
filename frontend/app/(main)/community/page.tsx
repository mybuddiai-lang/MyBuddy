'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, Plus, Hash, Lock, ChevronRight, MessageCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { communityApi } from '@/lib/api/community';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface Pod {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isPublic?: boolean;
  isPrivate?: boolean;
  field?: string;
  subject?: string;
  lastActivity?: string;
  isMember: boolean;
  myRole?: string | null;
  color: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  Medicine: 'bg-red-100 text-red-600',
  Anatomy: 'bg-blue-100 text-blue-600',
  Law: 'bg-amber-100 text-amber-600',
  Engineering: 'bg-green-100 text-green-600',
  Accounting: 'bg-purple-100 text-purple-600',
  Pharmacy: 'bg-teal-100 text-teal-600',
  General: 'bg-brand-100 text-brand-600',
};

const COLOR_LIST = Object.values(SUBJECT_COLORS);

function getColor(pod: Partial<Pod>): string {
  const key = pod.field || pod.subject || '';
  return SUBJECT_COLORS[key] || COLOR_LIST[Math.abs((pod.id?.charCodeAt(0) ?? 0)) % COLOR_LIST.length];
}

function normalisePod(p: any): Pod {
  const field = p.field || p.subjectFilter || 'General';
  return {
    ...p,
    field,
    isMember: !!p.myRole,
    color: getColor({ ...p, field }),
  };
}

export default function CommunityPage() {
  const router = useRouter();
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
  const [showCreate, setShowCreate] = useState(false);
  const [newPodName, setNewPodName] = useState('');
  const [newPodSubject, setNewPodSubject] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const fetchPods = () => {
    setLoading(true);
    setLoadError(false);
    communityApi.getAll()
      .then(res => {
        const list: any[] = (res as any)?.data?.data ?? (res as any)?.data ?? [];
        setPods(list.filter(p => p?.id).map(normalisePod));
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPods(); }, []);

  // Listen for communities created by other users in real-time
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
    if (!token) return;
    const socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
    });
    socket.on('community:new', (newPod: any) => {
      if (!newPod?.id) return;
      setPods(prev => {
        if (prev.some(p => p.id === newPod.id)) return prev;
        return [normalisePod(newPod), ...prev];
      });
    });
    return () => { socket.disconnect(); };
  }, []);

  const myPods = pods.filter(p => p.isMember);
  const discoverPods = pods.filter(p => !p.isMember);

  const filteredMy = myPods.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.field || p.subject || '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredDiscover = discoverPods.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.field || p.subject || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleJoin = async (podId: string) => {
    if (joining) return;
    setJoining(podId);
    try {
      const res = await communityApi.join(podId);
      const data = (res as any)?.data?.data ?? (res as any)?.data;
      if (data?.pending) {
        toast.success('Join request sent! Waiting for admin approval.');
      } else {
        setPods(prev => prev.map(p =>
          p.id === podId ? { ...p, isMember: true, myRole: 'MEMBER', memberCount: (p.memberCount || 0) + 1 } : p
        ));
        toast.success('Joined! Tap "Open Pod" to get started.');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        // Already a member — sync state
        setPods(prev => prev.map(p => p.id === podId ? { ...p, isMember: true, myRole: 'MEMBER' } : p));
        toast.success('You\'re already in this pod!');
      } else {
        toast.error('Could not join — please try again');
      }
    } finally {
      setJoining(null);
    }
  };

  const handleCreate = async () => {
    if (!newPodName.trim()) return toast.error('Give your pod a name');
    setCreating(true);
    const tempId = `pod-${Date.now()}`;
    const optimisticPod: Pod = {
      id: tempId,
      name: newPodName,
      description: `A study pod for ${newPodSubject || 'students'}`,
      memberCount: 1,
      isPublic: true,
      field: newPodSubject || 'General',
      lastActivity: 'Just now',
      isMember: true,
      myRole: 'ADMIN',
      color: SUBJECT_COLORS[newPodSubject] || 'bg-brand-100 text-brand-600',
    };
    // Close the sheet and show the pod immediately (optimistic)
    setPods(prev => [optimisticPod, ...prev]);
    setShowCreate(false);
    setNewPodName('');
    setNewPodSubject('');
    try {
      const res = await communityApi.create({ name: optimisticPod.name, description: optimisticPod.description, field: optimisticPod.field || 'General' });
      const created = (res as any)?.data?.data ?? (res as any)?.data;
      if (created?.id) {
        // Replace the optimistic pod with the real one from the server.
        // The backend no longer broadcasts community:new to the creator, so
        // there is no socket-based race condition here — just a straight swap.
        setPods(prev => prev.map(p => p.id === tempId ? normalisePod({ ...created, myRole: 'ADMIN' }) : p));
        toast.success('Pod created! Share it with your classmates.');
      } else {
        // Unexpected response — roll back
        setPods(prev => prev.filter(p => p.id !== tempId));
        toast.error('Could not create pod — please try again.');
      }
    } catch {
      // Creation failed: remove the optimistic pod so the user knows it
      // wasn't actually saved (instead of showing a ghost pod).
      setPods(prev => prev.filter(p => p.id !== tempId));
      toast.error('Could not create pod — check your connection and try again.');
    }
    setCreating(false);
  };

  const displayList = activeTab === 'my' ? filteredMy : filteredDiscover;

  return (
    <div className="px-4 py-4 space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Community</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Study together, thrive together</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-soft hover:bg-brand-600 transition"
        >
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search pods..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
        />
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
        {(['my', 'discover'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
          >
            {tab === 'my' ? `My Pods (${myPods.length})` : `Discover (${discoverPods.length})`}
          </button>
        ))}
      </div>

      {/* Load error */}
      {loadError && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Couldn't load pods — check your connection</p>
          <button onClick={fetchPods} className="mt-3 text-sm text-brand-600 font-medium underline">Retry</button>
        </div>
      )}

      {/* Pod list */}
      <div className="space-y-3">
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-full w-2/3" />
                    <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && displayList.map((pod, i) => {
          const isPrivate = pod.isPrivate ?? !pod.isPublic;
          const podColor = pod.color || getColor(pod);
          const isJoining = joining === pod.id;
          return (
            <motion.div
              key={pod.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 shadow-card"
            >
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${podColor}`}>
                  {isPrivate ? <Lock size={18} /> : <Hash size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm truncate">{pod.name}</p>
                    <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full shrink-0">{pod.field || pod.subject}</span>
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-1">{pod.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Users size={10} /> {pod.memberCount} members
                    </span>
                    {pod.lastActivity && (
                      <>
                        <span className="text-xs text-zinc-300">·</span>
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <MessageCircle size={10} /> {pod.lastActivity}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {pod.isMember ? (
                  <button
                    onClick={() => router.push(`/community/${pod.id}`)}
                    className="text-zinc-300 hover:text-zinc-500 shrink-0 mt-1"
                  >
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoin(pod.id)}
                    disabled={isJoining}
                    className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-brand-600 disabled:opacity-60 transition shrink-0"
                  >
                    {isJoining ? '...' : 'Join'}
                  </button>
                )}
              </div>
              {pod.isMember && (
                <button
                  onClick={() => router.push(`/community/${pod.id}`)}
                  className="mt-3 w-full py-2 rounded-xl text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 transition"
                >
                  Open Pod →
                </button>
              )}
            </motion.div>
          );
        })}

        {!loading && displayList.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">{activeTab === 'my' ? 'No pods yet' : 'No matching pods'}</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">{activeTab === 'my' ? 'Join or create a study pod' : 'Try a different search'}</p>
          </div>
        )}
      </div>

      {/* Create pod bottom sheet */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowCreate(false)}>
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full bg-white dark:bg-zinc-900 rounded-t-3xl p-6 space-y-4 border-t border-zinc-100 dark:border-zinc-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Create Study Pod</h2>
            <input
              type="text"
              value={newPodName}
              onChange={e => setNewPodName(e.target.value)}
              placeholder="Pod name (e.g. MBBS Finals 2026)"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
            <input
              type="text"
              value={newPodSubject}
              onChange={e => setNewPodSubject(e.target.value)}
              placeholder="Subject / field (e.g. Medicine, Law)"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Your pod will be public by default. Anyone can join.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-60 transition shadow-soft"
              >
                {creating ? 'Creating...' : 'Create Pod'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
