'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Heart, Users, Hash, Pin, MoreHorizontal } from 'lucide-react';

interface Post {
  id: string;
  author: string;
  initials: string;
  content: string;
  likesCount: number;
  liked: boolean;
  time: string;
  isPinned?: boolean;
}

const MOCK_PODS: Record<string, { name: string; description: string; subject: string; memberCount: number }> = {
  '1': { name: 'MBBS Finals 2026', description: 'Study group for final year medical students', subject: 'Medicine', memberCount: 48 },
  '2': { name: 'Anatomy Nerds', description: 'Anatomy deep dives, diagrams, and mnemonics', subject: 'Anatomy', memberCount: 23 },
  '3': { name: 'Bar Exam Prep', description: 'Nigerian Bar 2026 candidates', subject: 'Law', memberCount: 67 },
  '4': { name: 'Engineering Survivors', description: 'For engineering students surviving thermodynamics', subject: 'Engineering', memberCount: 31 },
};

const INITIAL_POSTS: Post[] = [
  { id: 'p0', author: 'Moderator', initials: 'M', content: '📌 Welcome! Please keep discussions relevant and supportive. Share resources, ask questions, and support each other. No spam.', likesCount: 14, liked: false, time: '2d ago', isPinned: true },
  { id: 'p1', author: 'Amara O.', initials: 'AO', content: 'Can someone explain the difference between pharmacokinetics and pharmacodynamics again? I keep mixing them up 😅', likesCount: 5, liked: false, time: '3h ago' },
  { id: 'p2', author: 'Tobi A.', initials: 'TA', content: 'Pharmacokinetics = what the body does to the drug (ADME). Pharmacodynamics = what the drug does to the body (mechanism, effect). Hope that helps! 💪', likesCount: 11, liked: true, time: '2h ago' },
  { id: 'p3', author: 'Chisom E.', initials: 'CE', content: 'Just uploaded my cardiology mnemonics PDF to my slides — feel free to use them for revision. Best of luck everyone 🫀', likesCount: 23, liked: false, time: '1h ago' },
  { id: 'p4', author: 'Emeka N.', initials: 'EN', content: 'How many hours are you all studying daily at this point? I\'m at about 8-9h and feeling burned out. Anyone else?', likesCount: 8, liked: false, time: '45m ago' },
  { id: 'p5', author: 'Lara K.', initials: 'LK', content: 'Same, @Emeka. I chat with Buddi when I get overwhelmed. It actually helps me decompress. Try it! Quality > quantity too — I shifted to 6h focused + breaks and my retention improved.', likesCount: 17, liked: false, time: '30m ago' },
];

export default function PodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pod = MOCK_PODS[id] || { name: 'Study Pod', description: '', subject: 'General', memberCount: 10 };

  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [newPost, setNewPost] = useState('');
  const [sending, setSending] = useState(false);

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: !p.liked, likesCount: p.liked ? p.likesCount - 1 : p.likesCount + 1 }
        : p
    ));
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 600));
    const post: Post = {
      id: `p${Date.now()}`,
      author: 'You',
      initials: 'U',
      content: newPost.trim(),
      likesCount: 0,
      liked: false,
      time: 'Just now',
    };
    setPosts(prev => [...prev, post]);
    setNewPost('');
    setSending(false);
  };

  const pinnedPost = posts.find(p => p.isPinned);
  const feedPosts = posts.filter(p => !p.isPinned);

  return (
    <div className="flex flex-col h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-zinc-100 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition shrink-0">
          <ArrowLeft size={16} className="text-zinc-600" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <Hash size={16} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-900 truncate">{pod.name}</p>
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <Users size={9} /> {pod.memberCount} members · {pod.subject}
          </p>
        </div>
        <button className="text-zinc-400 hover:text-zinc-600 transition">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Posts feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Pinned post */}
        {pinnedPost && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-50 border border-brand-100 rounded-2xl p-4"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Pin size={12} className="text-brand-500" />
              <span className="text-xs font-medium text-brand-600">Pinned</span>
            </div>
            <p className="text-sm text-zinc-700 leading-relaxed">{pinnedPost.content}</p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {feedPosts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-card"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 shrink-0">
                  {post.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-800">{post.author}</span>
                    <span className="text-xs text-zinc-400">{post.time}</span>
                  </div>
                  <p className="text-sm text-zinc-700 leading-relaxed mt-1">{post.content}</p>
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 mt-2 text-xs font-medium transition ${
                      post.liked ? 'text-red-500' : 'text-zinc-400 hover:text-red-400'
                    }`}
                  >
                    <Heart size={13} fill={post.liked ? 'currentColor' : 'none'} />
                    {post.likesCount}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Compose */}
      <div className="px-4 py-3 bg-white border-t border-zinc-100 shrink-0">
        <div className="flex items-end gap-2 bg-zinc-50 rounded-2xl px-4 py-2 border border-zinc-200 focus-within:border-brand-300 transition">
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder={`Share something with ${pod.name}…`}
            rows={1}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 100) + 'px';
            }}
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none leading-relaxed py-1"
            style={{ maxHeight: '100px' }}
          />
          <button
            onClick={handlePost}
            disabled={!newPost.trim() || sending}
            className="w-8 h-8 rounded-full bg-brand-500 disabled:bg-zinc-200 flex items-center justify-center shrink-0 mb-0.5 transition"
          >
            {sending
              ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Send size={13} className={newPost.trim() ? 'text-white' : 'text-zinc-400'} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
