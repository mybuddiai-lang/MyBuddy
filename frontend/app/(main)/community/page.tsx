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
    isMember: !!(p.myRole),
    color: getColor({ ...p, field }),
  };
}

// Module-level cache — survives navigation (component unmount/remount)
// but resets on full page refresh, which is the desired behaviour.
let _podsCache: Pod[] = [];

export default function CommunityPage() {
  const router = useRouter();
  // Initialise from cache so pods don't vanish when the user navigates back
  const [pods, setPods] = useState<Pod[]>(_podsCache);
  const [loading, setLoading] = useState(_podsCache.length === 0);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
  const [showCreate, setShowCreate] = useState(false);
  const [newPodName, setNewPodName] = useState('');
  const [newPodSubject, setNewPodSubject] = useState('');
  const [search, setSearch] = useState('');
  const [newPodDesc, setNewPodDesc] = useState('');
  const [newPodPrivate, setNewPodPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const fetchPods = () => {
    // Only show skeletons on the very first load — when we already have cached
    // pods, do a background refresh so the screen doesn't flash empty.
    if (_podsCache.length === 0) setLoading(true);
    setLoadError(false);
    const attempt = (n: number) => {
      communityApi.getAll()
        .then(res => {
          // The global TransformInterceptor wraps every response in { data: ... }
          // Axios adds its own .data layer, so the array lives at res.data.data.
          // Handle both wrapped and unwrapped shapes defensively.
          const raw: unknown = (res as any)?.data?.data ?? (res as any)?.data;
          const list: any[] = Array.isArray(raw) ? raw : [];
          const normalised = list.filter(p => p?.id).map(normalisePod);
          _podsCache = normalised;       // persist across navigation
          setPods(normalised);
          setLoading(false);
        })
        .catch(() => {
          if (n < 2) {
            // Retry up to 3 times (n=0,1,2) before surfacing the error
            setTimeout(() => attempt(n + 1), 1500);
          } else {
            // Only flag a load error when we have nothing to display.
            if (_podsCache.length === 0) setLoadError(true);
            setLoading(false);
          }
        });
    };
    attempt(0);
  };

  useEffect(() => { fetchPods(); }, []);

  // Listen for communities created by other users in real-time
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
    if (!token) return;
    const socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socket.on('community:new', (newPod: any) => {
      if (!newPod?.id) return;
      setPods(prev => {
        if (prev.some(p => p.id === newPod.id)) return prev;
        const next = [normalisePod(newPod), ...prev];
        _podsCache = next;
        return next;
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
        setPods(prev => {
          const next = prev.map(p =>
            p.id === podId ? { ...p, isMember: true, myRole: 'MEMBER', memberCount: (p.memberCount || 0) + 1 } : p
          );
          _podsCache = next;
          return next;
        });
        toast.success('Joined! Tap "Open Pod" to get started.');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        // Already a member — sync state
        setPods(prev => {
          const next = prev.map(p => p.id === podId ? { ...p, isMember: true, myRole: 'MEMBER' } : p);
          _podsCache = next;
          return next;
        });
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
    const field = newPodSubject || 'General';
    const description = newPodDesc.trim() || `A study pod for ${field} students`;
    const tempId = `pod-${Date.now()}`;
    const optimisticPod: Pod = {
      id: tempId,
      name: newPodName,
      description,
      memberCount: 1,
      isPublic: !newPodPrivate,
      field,
      lastActivity: 'Just now',
      isMember: true,
      myRole: 'ADMIN',
      color: SUBJECT_COLORS[field] || 'bg-brand-100 text-brand-600',
    };
    // Close the sheet and show the pod immediately (optimistic)
    setPods(prev => { const next = [optimisticPod, ...prev]; _podsCache = next; return next; });
    setShowCreate(false);
    setNewPodName('');
    setNewPodSubject('');
    setNewPodDesc('');
    setNewPodPrivate(false);
    try {
      const res = await communityApi.create({ name: optimisticPod.name, description, field, isPrivate: newPodPrivate });
      const created = (res as any)?.data?.data ?? (res as any)?.data;
      if (created?.id) {
        setPods(prev => {
          const next = prev.map(p => p.id === tempId ? normalisePod({ ...created, myRole: 'ADMIN' }) : p);
          _podsCache = next;
          return next;
        });
        toast.success('Pod created! Share it with your classmates.');
      } else {
        setPods(prev => { const next = prev.filter(p => p.id !== tempId); _podsCache = next; return next; });
        toast.error('Could not create pod — please try again.');
      }
    } catch {
      setPods(prev => { const next = prev.filter(p => p.id !== tempId); _podsCache = next; return next; });
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

      {/* Load error — only surface when we have nothing to show */}
      {loadError && !loading && pods.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Couldn&apos;t load pods — check your connection</p>
          <button onClick={fetchPods} className="mt-3 text-sm text-brand-600 font-medium underline">Retry</button>
        </div>
      )}

      {/* Pod list */}
      <div className="space-y-3">
        {/* Only show skeleton when loading AND we have no pods to display yet */}
        {loading && pods.length === 0 && (
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
        {displayList.map((pod, i) => {
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

        {!loading && !loadError && displayList.length === 0 && (
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
            <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Create Study Pod</h2>

            {/* Pod name */}
            <input
              type="text"
              value={newPodName}
              onChange={e => setNewPodName(e.target.value)}
              placeholder="Pod name (e.g. MBBS Finals 2026)"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              autoFocus
            />

            {/* Subject selector */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">Field / Subject</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(SUBJECT_COLORS).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewPodSubject(s === newPodSubject ? '' : s)}
                    className={`py-2 rounded-xl text-xs font-semibold transition border ${
                      newPodSubject === s
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-brand-300 dark:hover:border-brand-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional description */}
            <input
              type="text"
              value={newPodDesc}
              onChange={e => setNewPodDesc(e.target.value)}
              placeholder="Short description (optional)"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />

            {/* Visibility toggle */}
            <label className="flex items-center justify-between cursor-pointer py-1">
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Private pod</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Require approval to join</p>
              </div>
              <div
                onClick={() => setNewPodPrivate(v => !v)}
                className={`w-11 h-6 rounded-full transition relative ${newPodPrivate ? 'bg-brand-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${newPodPrivate ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </label>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowCreate(false); setNewPodName(''); setNewPodSubject(''); setNewPodDesc(''); setNewPodPrivate(false); }}
                className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newPodName.trim()}
                className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition shadow-soft"
              >
                {creating ? 'Creating…' : 'Create Pod'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
