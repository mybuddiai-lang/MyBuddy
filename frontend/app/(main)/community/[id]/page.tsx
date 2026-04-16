'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Heart, Users, Hash, Pin, MoreHorizontal, MessageSquare,
  Paperclip, Mic, Image as ImageIcon, FileText, BarChart2, X, Plus, ChevronDown,
  Check, LogOut, UserCog, Clock, Trash2,
} from 'lucide-react';
import { communityApi, CommunityPost, CommunityPostReply, CommunityPoll, CommunityMember, JoinRequest } from '@/lib/api/community';
import { useAuthStore } from '@/lib/store/auth.store';
import { useCommunitySocket } from '@/lib/hooks/use-community-socket';
import { useVoiceRecorder } from '@/lib/hooks/use-voice-recorder';
import toast from 'react-hot-toast';

interface PodMeta {
  name: string;
  description: string;
  field: string;
  memberCount: number;
  requiresApproval: boolean;
  myRole: 'ADMIN' | 'MODERATOR' | 'MEMBER' | null;
}

function nameToInitials(name: string): string {
  return name.split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2);
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Attachment preview ───────────────────────────────────────────────────────

function AttachmentPreview({ url, type }: { url: string; type?: 'FILE' | 'IMAGE' | 'VOICE' }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!url) return null;

  if (type === 'IMAGE' && !imgError) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <div className={`relative rounded-xl overflow-hidden bg-zinc-100 ${imgLoaded ? '' : 'min-h-[120px]'}`}>
          <img
            src={url}
            alt="attachment"
            className={`max-w-[240px] w-full object-cover rounded-xl transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
          {!imgLoaded && (
            <div className="w-[240px] h-[140px] flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </a>
    );
  }

  if (type === 'IMAGE' && imgError) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100">
        <span>🖼️ Image unavailable</span>
      </div>
    );
  }

  if (type === 'VOICE') {
    return <audio controls src={url} className="mt-2 w-full h-8" />;
  }

  const filename = url.split('/').pop()?.split('?')[0] || 'File';
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 text-xs text-brand-600 bg-brand-50 rounded-lg px-3 py-2 border border-brand-100 w-fit">
      <FileText size={13} /> {filename}
    </a>
  );
}

// ─── Reply thread ─────────────────────────────────────────────────────────────

function ReplyThread({ communityId, postId, userId }: { communityId: string; postId: string; userId: string }) {
  const [replies, setReplies] = useState<CommunityPostReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachType, setAttachType] = useState<'FILE' | 'IMAGE' | 'VOICE' | null>(null);
  const [attachPreviewUrl, setAttachPreviewUrl] = useState<string | null>(null);
  const [fileAccept, setFileAccept] = useState('image/*,audio/*,*/*');
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { isRecording: isMicActive, recordingTime: micTime, toggleRecording } = useVoiceRecorder((file) => {
    setAttachFile(file);
    setAttachType('VOICE');
    if (attachPreviewUrl) URL.revokeObjectURL(attachPreviewUrl);
    setAttachPreviewUrl(null);
  });

  const handleMic = async () => {
    try { await toggleRecording(); }
    catch { toast.error('Could not access microphone. Please check permissions.'); }
  };

  // Revoke blob preview URL on cleanup
  useEffect(() => {
    return () => { if (attachPreviewUrl) URL.revokeObjectURL(attachPreviewUrl); };
  }, [attachPreviewUrl]);

  useEffect(() => {
    setLoadError(false);
    communityApi.getReplies(communityId, postId)
      .then((res: any) => setReplies(res?.data?.data ?? []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [communityId, postId]);

  const handleAttach = (type: 'FILE' | 'IMAGE' | 'VOICE') => {
    const accept = type === 'IMAGE' ? 'image/*' : type === 'VOICE' ? 'audio/*' : '*/*';
    setAttachType(type);
    setFileAccept(accept);
    requestAnimationFrame(() => fileRef.current?.click());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachFile(file);
      if (file.type.startsWith('image/')) {
        if (attachPreviewUrl) URL.revokeObjectURL(attachPreviewUrl);
        setAttachPreviewUrl(URL.createObjectURL(file));
      } else {
        if (attachPreviewUrl) URL.revokeObjectURL(attachPreviewUrl);
        setAttachPreviewUrl(null);
      }
    }
    e.target.value = '';
  };

  const handleSend = async () => {
    if (!replyText.trim() && !attachFile) return;
    setSending(true);

    // Upload file to Cloudflare R2 first
    let resolvedUrl: string | undefined;
    let resolvedType = attachType;
    if (attachFile) {
      try {
        const uploadRes = await communityApi.uploadAttachment(attachFile);
        const uploadData = (uploadRes as any)?.data?.data ?? (uploadRes as any)?.data;
        resolvedUrl = uploadData?.url;
        resolvedType = uploadData?.type ?? attachType;
      } catch {
        // continue without attachment
      }
    }

    const optimistic: CommunityPostReply = {
      id: `local-${Date.now()}`,
      postId,
      authorId: userId,
      author: { id: userId, name: 'You' },
      content: replyText.trim(),
      // Only include attachment URL when it was successfully uploaded
      attachmentUrl: resolvedUrl,
      attachmentType: resolvedUrl ? (resolvedType ?? undefined) : undefined,
      createdAt: new Date().toISOString(),
    };
    setReplies(prev => [...prev, optimistic]);
    setReplyText('');
    setAttachFile(null);
    setAttachType(null);
    if (attachPreviewUrl) URL.revokeObjectURL(attachPreviewUrl);
    setAttachPreviewUrl(null);

    try {
      const res = await communityApi.createReply(communityId, postId, {
        content: optimistic.content,
        attachmentUrl: resolvedUrl,
        attachmentType: resolvedType ?? undefined,
      });
      const created = (res as any)?.data?.data;
      if (created?.id) {
        // Swap optimistic entry with the real one from the server
        setReplies(prev => prev.map(r => r.id === optimistic.id ? created : r));
      } else {
        // Unexpected response shape — refetch authoritative list so the UI
        // stays in sync (the reply was created, we just couldn't confirm it)
        communityApi.getReplies(communityId, postId)
          .then((r: any) => setReplies(r?.data?.data ?? r?.data ?? []))
          .catch(() => setReplies(prev => prev.filter(r => r.id !== optimistic.id)));
      }
    } catch {
      toast.error('Failed to send reply. Please try again.');
      setReplies(prev => prev.filter(r => r.id !== optimistic.id));
    }
    setSending(false);
  };

  return (
    <div className="mt-3 ml-12 space-y-2">
      {loading && <p className="text-xs text-zinc-400">Loading replies…</p>}
      {loadError && <p className="text-xs text-red-400">Could not load replies. Please try again.</p>}
      {replies.map(reply => (
        <div key={reply.id} className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
            {nameToInitials(reply.author?.name || '?')}
          </div>
          <div className="flex-1 bg-zinc-50 rounded-xl px-3 py-2 border border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-700">{reply.author?.name}</span>
              <span className="text-[10px] text-zinc-400">{relativeTime(reply.createdAt)}</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed mt-0.5">{reply.content}</p>
            {reply.attachmentUrl && (
              <AttachmentPreview url={reply.attachmentUrl} type={reply.attachmentType} />
            )}
          </div>
        </div>
      ))}

      {/* Pending attachment preview */}
      {attachFile && (
        <div className="flex items-center gap-2 bg-zinc-100 rounded-xl px-3 py-2 border border-zinc-200">
          {attachPreviewUrl ? (
            <img src={attachPreviewUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          ) : (
            <Paperclip size={11} className="text-zinc-400 shrink-0" />
          )}
          <span className="text-xs text-zinc-600 font-medium truncate max-w-[160px]">{attachFile.name}</span>
          <button
            onClick={() => {
              if (attachPreviewUrl) URL.revokeObjectURL(attachPreviewUrl);
              setAttachPreviewUrl(null);
              setAttachFile(null);
              setAttachType(null);
            }}
            className="ml-auto text-zinc-400 hover:text-red-400 transition"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Reply compose */}
      <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 focus-within:border-brand-300 transition">
        {isMicActive ? (
          <div className="flex-1 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-xs font-mono text-red-500 tabular-nums">{micTime}</span>
            <span className="text-[10px] text-zinc-400">Tap mic to stop</span>
          </div>
        ) : (
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Write a reply…"
            rows={1}
            className="flex-1 bg-transparent text-xs text-zinc-800 placeholder:text-zinc-400 resize-none focus:outline-none leading-relaxed overflow-hidden"
            style={{ height: '20px' }}
          />
        )}

        {/* Attach button group */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => handleAttach('IMAGE')} disabled={isMicActive} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-brand-500 disabled:opacity-40 transition" title="Attach image">
            <ImageIcon size={13} />
          </button>
          <button
            onClick={handleMic}
            className={`p-1 rounded-lg transition ${isMicActive ? 'text-red-500' : 'text-zinc-400 hover:text-brand-500 hover:bg-zinc-100'}`}
            title={isMicActive ? 'Stop recording' : 'Record voice note'}
          >
            <Mic size={13} className={isMicActive ? 'animate-pulse' : ''} />
          </button>
          <button onClick={() => handleAttach('FILE')} disabled={isMicActive} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-brand-500 disabled:opacity-40 transition" title="Attach file">
            <Paperclip size={13} />
          </button>
          <button
            onClick={handleSend}
            disabled={(!replyText.trim() && !attachFile) || sending}
            className="w-6 h-6 rounded-full bg-brand-500 disabled:bg-zinc-200 flex items-center justify-center transition"
          >
            {sending
              ? <div className="w-2.5 h-2.5 border border-white/40 border-t-white rounded-full animate-spin" />
              : <Send size={10} className={replyText.trim() || attachFile ? 'text-white' : 'text-zinc-400'} />
            }
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept={fileAccept} className="hidden" onChange={handleFileChange} />
    </div>
  );
}

// ─── Poll card ────────────────────────────────────────────────────────────────

function PollCard({ poll, communityId, onVote }: { poll: CommunityPoll; communityId: string; onVote: (pollId: string, optionId: string) => void }) {
  const totalVotes = poll.options.reduce((s, o) => s + o.votesCount, 0);
  const hasVoted = poll.myVotedOptionId !== null;
  const expired = poll.endsAt ? new Date(poll.endsAt) < new Date() : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-card"
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={14} className="text-brand-500" />
        <span className="text-xs font-semibold text-brand-600">Poll</span>
        {expired && <span className="text-[10px] text-zinc-400 ml-auto">Ended</span>}
        {!expired && poll.endsAt && (
          <span className="text-[10px] text-zinc-400 ml-auto flex items-center gap-1">
            <Clock size={9} /> Ends {relativeTime(poll.endsAt)}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-zinc-800 mb-3">{poll.question}</p>

      <div className="space-y-2">
        {poll.options.map(option => {
          const pct = totalVotes > 0 ? Math.round((option.votesCount / totalVotes) * 100) : 0;
          const isMyVote = poll.myVotedOptionId === option.id;
          return (
            <button
              key={option.id}
              disabled={hasVoted || expired}
              onClick={() => !hasVoted && !expired && onVote(poll.id, option.id)}
              className="w-full text-left relative"
            >
              <div className={`relative z-10 flex items-center justify-between px-3 py-2 rounded-xl border transition ${
                isMyVote ? 'border-brand-400 bg-brand-50' : 'border-zinc-200 bg-zinc-50 hover:border-brand-300'
              } ${hasVoted || expired ? 'cursor-default' : 'cursor-pointer'}`}>
                {/* Progress bar */}
                {hasVoted && (
                  <div
                    className="absolute inset-0 rounded-xl bg-brand-100 opacity-40 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className={`relative text-xs font-medium ${isMyVote ? 'text-brand-700' : 'text-zinc-700'}`}>
                  {option.text}
                  {isMyVote && <Check size={11} className="inline ml-1 text-brand-500" />}
                </span>
                {hasVoted && (
                  <span className="relative text-xs font-semibold text-zinc-500">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-zinc-400 mt-2 text-right">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
    </motion.div>
  );
}

// ─── Poll creator ─────────────────────────────────────────────────────────────

function PollCreator({ communityId, onCreated, onClose }: { communityId: string; onCreated: (poll: CommunityPoll) => void; onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);

  const addOption = () => { if (options.length < 6) setOptions(prev => [...prev, '']); };
  const removeOption = (i: number) => setOptions(prev => prev.filter((_, idx) => idx !== i));
  const updateOption = (i: number, val: string) => setOptions(prev => prev.map((o, idx) => idx === i ? val : o));

  const handleSubmit = async () => {
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) return;
    setSubmitting(true);
    try {
      const res = await communityApi.createPoll(communityId, { question: question.trim(), options: validOptions });
      const created = (res as any)?.data?.data;
      if (created) onCreated({ ...created, myVotedOptionId: null, options: (created.options ?? []).map((o: any) => ({ ...o, votedByMe: false })) });
      onClose();
    } catch {
      toast.error('Failed to create poll. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-800 border border-brand-200 dark:border-zinc-700 rounded-2xl p-4 shadow-card"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
          <BarChart2 size={15} className="text-brand-500" /> Create Poll
        </span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
          <X size={16} />
        </button>
      </div>

      <input
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="Ask a question…"
        className="w-full text-sm bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-zinc-200 dark:border-zinc-600 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-400 dark:focus:border-brand-500 mb-3"
      />

      <div className="space-y-2 mb-3">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={opt}
              onChange={e => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 text-sm bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-zinc-200 dark:border-zinc-600 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-400 dark:focus:border-brand-500"
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="text-zinc-400 hover:text-red-400 shrink-0">
                <X size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        {options.length < 6 && (
          <button onClick={addOption} className="text-xs text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 font-medium">
            <Plus size={12} /> Add option
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!question.trim() || options.filter(o => o.trim()).length < 2 || submitting}
          className="ml-auto text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-xl disabled:opacity-40 transition"
        >
          {submitting ? 'Creating…' : 'Create Poll'}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Member management sheet ──────────────────────────────────────────────────

function MemberSheet({
  communityId, members, joinRequests, myId, requiresApproval,
  onClose, onRoleChange, onRemove, onApprove, onReject,
}: {
  communityId: string;
  members: CommunityMember[];
  joinRequests: JoinRequest[];
  myId: string;
  requiresApproval: boolean;
  onClose: () => void;
  onRoleChange: (userId: string, role: 'MEMBER' | 'ADMIN') => void;
  onRemove: (userId: string) => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}) {
  const [tab, setTab] = useState<'members' | 'requests'>('members');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-t-3xl px-4 pt-4 pb-safe max-h-[75vh] flex flex-col"
      >
        <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-zinc-800">Manage Pod</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
        </div>

        {requiresApproval && (
          <div className="flex border border-zinc-200 rounded-xl overflow-hidden mb-4 text-xs font-semibold">
            <button
              onClick={() => setTab('members')}
              className={`flex-1 py-2 transition ${tab === 'members' ? 'bg-brand-500 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
            >
              Members
            </button>
            <button
              onClick={() => setTab('requests')}
              className={`flex-1 py-2 transition ${tab === 'requests' ? 'bg-brand-500 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
            >
              Requests {joinRequests.length > 0 && `(${joinRequests.length})`}
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 space-y-2 pb-4">
          {tab === 'members' ? (
            members.map(m => (
              <div key={m.id} className="flex items-center gap-3 py-2 border-b border-zinc-50">
                <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
                  {nameToInitials(m.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 truncate">{m.user.name} {m.userId === myId && <span className="text-zinc-400 font-normal">(you)</span>}</p>
                  <p className="text-xs text-zinc-400">{m.role}</p>
                </div>
                {m.userId !== myId && (
                  <div className="flex items-center gap-1 shrink-0">
                    {m.role !== 'ADMIN' && (
                      <button
                        onClick={() => onRoleChange(m.userId, 'ADMIN')}
                        className="text-[10px] px-2 py-1 rounded-lg bg-brand-50 text-brand-600 font-medium hover:bg-brand-100 transition"
                      >
                        Make Admin
                      </button>
                    )}
                    {m.role === 'ADMIN' && (
                      <button
                        onClick={() => onRoleChange(m.userId, 'MEMBER')}
                        className="text-[10px] px-2 py-1 rounded-lg bg-zinc-100 text-zinc-500 font-medium hover:bg-zinc-200 transition"
                      >
                        Demote
                      </button>
                    )}
                    <button
                      onClick={() => onRemove(m.userId)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-red-50 text-red-500 font-medium hover:bg-red-100 transition"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            joinRequests.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">No pending requests</p>
            ) : (
              joinRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 py-2 border-b border-zinc-50">
                  <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
                    {nameToInitials(req.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 truncate">{req.user.name}</p>
                    <p className="text-[10px] text-zinc-400">{relativeTime(req.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onApprove(req.id)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onReject(req.id)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-zinc-100 text-zinc-500 font-medium hover:bg-zinc-200 transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [pod, setPod] = useState<PodMeta | null>(null);
  const [podLoading, setPodLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'polls'>('posts');
  const [posts, setPosts] = useState<(CommunityPost & { liked: boolean; isPinned?: boolean })[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [polls, setPolls] = useState<CommunityPoll[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [newPost, setNewPost] = useState('');
  const [postAttachFile, setPostAttachFile] = useState<File | null>(null);
  const [postAttachType, setPostAttachType] = useState<'FILE' | 'IMAGE' | 'VOICE' | null>(null);
  const [postAttachPreviewUrl, setPostAttachPreviewUrl] = useState<string | null>(null);
  // React-controlled accept so the file picker filters correctly on iOS Safari
  const [postFileAccept, setPostFileAccept] = useState('image/*,audio/*,*/*');
  const [sending, setSending] = useState(false);
  const [pollLoadError, setPollLoadError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMemberSheet, setShowMemberSheet] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const postFileRef = useRef<HTMLInputElement>(null);
  const postTextareaRef = useRef<HTMLTextAreaElement>(null);
  // true = user is at (or near) the bottom → auto-scroll new messages into view
  const isAtBottom = useRef(true);

  const { isRecording: isPostMicActive, recordingTime: postMicTime, toggleRecording: togglePostMic } = useVoiceRecorder((file) => {
    setPostAttachFile(file);
    setPostAttachType('VOICE');
    if (postAttachPreviewUrl) URL.revokeObjectURL(postAttachPreviewUrl);
    setPostAttachPreviewUrl(null);
  });

  const handlePostMic = async () => {
    try { await togglePostMic(); }
    catch { toast.error('Could not access microphone. Please check permissions.'); }
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  // Revoke pending image preview blob URL on cleanup
  useEffect(() => {
    return () => { if (postAttachPreviewUrl) URL.revokeObjectURL(postAttachPreviewUrl); };
  }, [postAttachPreviewUrl]);

  // Auto-scroll to latest post whenever the list changes, but only if the user
  // is already at (or near) the bottom — so manual upward scrolling isn't hijacked
  useEffect(() => {
    if (activeTab === 'posts' && isAtBottom.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
    }
  }, [posts, activeTab]);

  const isPlatformAdmin = user?.role === 'ADMIN';
  const isAdmin = pod?.myRole === 'ADMIN' || isPlatformAdmin;
  const canDeleteAny = isPlatformAdmin || pod?.myRole === 'ADMIN' || pod?.myRole === 'MODERATOR';

  // Real-time socket connection
  useCommunitySocket(id, {
    onNewPost: (post) => {
      // Only add if it's not our own optimistic post (our own posts are added optimistically)
      setPosts(prev => {
        const isDuplicate = prev.some(p => p.id === post.id);
        if (isDuplicate) return prev;
        return [...prev, { ...post, liked: false }];
      });
    },
    onDeletePost: ({ postId }) => {
      setPosts(prev => prev.filter(p => p.id !== postId));
    },
    onNewReply: ({ postId }) => {
      // Increment reply count on the post so the UI reflects it
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, repliesCount: (p.repliesCount ?? 0) + 1 } : p
      ));
    },
    onDeleteReply: ({ postId }) => {
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, repliesCount: Math.max(0, (p.repliesCount ?? 0) - 1) } : p
      ));
    },
    onNewPoll: (poll) => {
      setPolls(prev => {
        const isDuplicate = prev.some(p => p.id === poll.id);
        if (isDuplicate) return prev;
        return [poll, ...prev];
      });
    },
    onPollUpdate: (updatedPoll) => {
      setPolls(prev => prev.map(p => p.id === updatedPoll.id ? updatedPoll : p));
    },
  });

  // Load data
  useEffect(() => {
    setPostsLoading(true);
    setPodLoading(true);

    // Posts
    communityApi.getPosts(id)
      .then((res: any) => {
        const apiPosts: CommunityPost[] = res?.data?.data ?? [];
        setPosts(apiPosts.map(p => ({ ...p, liked: false })));
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false));

    // Pod meta — getOne returns myRole for the requesting user
    communityApi.getOne(id)
      .then((res: any) => {
        const found = res?.data?.data ?? res?.data;
        if (found?.id) {
          setPod({
            name: found.name,
            description: found.description || '',
            field: found.field || found.subjectFilter || 'General',
            memberCount: found.memberCount,
            requiresApproval: found.requiresApproval ?? false,
            myRole: found.myRole ?? null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setPodLoading(false));

    // Polls
    setPollLoadError(false);
    communityApi.getPolls(id)
      .then((res: any) => setPolls(res?.data?.data ?? []))
      .catch(() => setPollLoadError(true));
  }, [id]);

  // Load members & join requests for admin
  useEffect(() => {
    if (!isAdmin) return;
    communityApi.getMembers(id).then((res: any) => setMembers(res?.data?.data ?? [])).catch(() => {});
    if (pod?.requiresApproval) {
      communityApi.getJoinRequests(id).then((res: any) => setJoinRequests(res?.data?.data ?? [])).catch(() => {});
    }
  }, [id, isAdmin, pod?.requiresApproval]);

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasLiked = post.liked;
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, liked: !p.liked, likesCount: wasLiked ? p.likesCount - 1 : p.likesCount + 1 } : p
    ));
    try {
      if (wasLiked) await communityApi.unlikePost(id, postId);
      else await communityApi.likePost(id, postId);
    } catch {
      // revert
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, liked: wasLiked, likesCount: wasLiked ? p.likesCount + 1 : p.likesCount - 1 } : p
      ));
    }
  };

  const handlePost = async () => {
    if (!newPost.trim() && !postAttachFile) return;
    setSending(true);
    const content = newPost.trim();
    const file = postAttachFile;
    const attachType = postAttachType;

    // Upload file to Cloudflare R2 first, then create the post with the real URL
    let resolvedUrl: string | undefined;
    let resolvedType = attachType;
    if (file) {
      try {
        const uploadRes = await communityApi.uploadAttachment(file);
        const uploadData = (uploadRes as any)?.data?.data ?? (uploadRes as any)?.data;
        resolvedUrl = uploadData?.url;
        resolvedType = uploadData?.type ?? attachType;
      } catch {
        toast.error('File upload failed — posting without attachment.');
      }
    }

    const optimistic: any = {
      id: `local-${Date.now()}`,
      authorId: user?.id || '',
      author: { id: user?.id || '', name: user?.name || 'You' },
      content,
      // Only include attachment if it was successfully uploaded — never use a
      // local blob URL, which is meaningless to other members and misleading
      // when the upload actually failed.
      attachmentUrl: resolvedUrl,
      attachmentType: resolvedUrl ? (resolvedType ?? undefined) : undefined,
      likesCount: 0,
      commentsCount: 0,
      repliesCount: 0,
      liked: false,
      createdAt: new Date().toISOString(),
    };
    // Always scroll to bottom when the user themselves posts
    isAtBottom.current = true;
    setPosts(prev => [...prev, optimistic]);
    setNewPost('');
    if (postTextareaRef.current) postTextareaRef.current.style.height = '24px';
    setPostAttachFile(null);
    setPostAttachType(null);
    if (postAttachPreviewUrl) URL.revokeObjectURL(postAttachPreviewUrl);
    setPostAttachPreviewUrl(null);

    try {
      const res = await communityApi.createPost(id, {
        content,
        attachmentUrl: resolvedUrl,
        attachmentType: resolvedType ?? undefined,
      });
      const created = (res as any)?.data?.data;
      if (created?.id) {
        setPosts(prev => {
          // Replace optimistic post, then deduplicate in case the socket already
          // added the real post before the API response arrived.
          const replaced = prev.map(p => p.id === optimistic.id ? { ...created, liked: false } : p);
          const seen = new Set<string>();
          return replaced.filter(p => !seen.has(p.id) && !!seen.add(p.id));
        });
      } else {
        // Unexpected response shape — refetch to get the authoritative list
        communityApi.getPosts(id)
          .then((r: any) => {
            const apiPosts: CommunityPost[] = r?.data?.data ?? r?.data ?? [];
            setPosts(apiPosts.map(p => ({ ...p, liked: false })));
          })
          .catch(() => setPosts(prev => prev.filter(p => p.id !== optimistic.id)));
      }
    } catch {
      toast.error('Failed to post. Please try again.');
      setPosts(prev => prev.filter(p => p.id !== optimistic.id));
    }
    setSending(false);
  };

  const handlePostAttach = (type: 'FILE' | 'IMAGE' | 'VOICE') => {
    const accept = type === 'IMAGE' ? 'image/*' : type === 'VOICE' ? 'audio/*' : '*/*';
    setPostAttachType(type);
    setPostFileAccept(accept);
    // requestAnimationFrame gives React a render cycle to update the accept
    // attribute before the file picker opens — fixes iOS Safari filtering.
    requestAnimationFrame(() => postFileRef.current?.click());
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await communityApi.votePoll(id, pollId, optionId);
      setPolls(prev => prev.map(p => {
        if (p.id !== pollId) return p;
        return {
          ...p,
          myVotedOptionId: optionId,
          options: p.options.map(o => ({
            ...o,
            votesCount: o.id === optionId ? o.votesCount + 1 : o.votesCount,
            votedByMe: o.id === optionId,
          })),
        };
      }));
    } catch {
      toast.error('Failed to submit vote. Please try again.');
    }
  };

  const handleRoleChange = async (userId: string, role: 'MEMBER' | 'ADMIN') => {
    try {
      await communityApi.assignRole(id, userId, role);
      setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role } : m));
    } catch { /* silent */ }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await communityApi.removeMember(id, userId);
      setMembers(prev => prev.filter(m => m.userId !== userId));
      setPod(prev => prev ? { ...prev, memberCount: prev.memberCount - 1 } : prev);
    } catch { /* silent */ }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await communityApi.approveJoinRequest(id, requestId);
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      setPod(prev => prev ? { ...prev, memberCount: prev.memberCount + 1 } : prev);
    } catch { /* silent */ }
  };

  const handleReject = async (requestId: string) => {
    try {
      await communityApi.rejectJoinRequest(id, requestId);
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
    } catch { /* silent */ }
  };

  const handleLeave = async () => {
    try {
      await communityApi.leave(id);
      router.push('/community');
    } catch { /* silent */ }
  };

  const handleDeletePost = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId)); // optimistic
    try {
      await communityApi.deletePost(id, postId);
    } catch {
      toast.error('Could not delete post');
      // Re-fetch to restore
      communityApi.getPosts(id).then((res: any) => {
        const apiPosts: CommunityPost[] = res?.data?.data ?? [];
        setPosts(apiPosts.map(p => ({ ...p, liked: false })));
      }).catch(() => {});
    }
  };

  return (
    <div
      className="flex flex-col bg-white dark:bg-zinc-950"
      style={{
        position: 'fixed',
        top: 'calc(56px + env(safe-area-inset-top, 0px))',
        bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        left: 0,
        right: 0,
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-zinc-100 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition shrink-0">
          <ArrowLeft size={16} className="text-zinc-600" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <Hash size={16} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          {podLoading && !pod ? (
            <div className="space-y-1.5 animate-pulse">
              <div className="h-3.5 bg-zinc-100 rounded-full w-32" />
              <div className="h-2.5 bg-zinc-100 rounded-full w-24" />
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-zinc-900 truncate">{pod?.name ?? 'Pod'}</p>
              <p className="text-xs text-zinc-400 flex items-center gap-1">
                <Users size={9} /> {pod?.memberCount ?? 0} members · {pod?.field ?? 'General'}
                {pod?.myRole && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 text-[9px] font-semibold">{pod.myRole}</span>}
              </p>
            </>
          )}
        </div>

        {/* More menu */}
        <div className="relative">
          <button onClick={() => setShowMenu(v => !v)} className="text-zinc-400 hover:text-zinc-600 transition p-1">
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 top-8 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 min-w-[160px] z-20"
              >
                {isAdmin && (
                  <button
                    onClick={() => { setShowMemberSheet(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition"
                  >
                    <UserCog size={14} /> Manage Members
                  </button>
                )}
                <button
                  onClick={() => { handleLeave(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                >
                  <LogOut size={14} /> Leave Pod
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-100 bg-white shrink-0">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-2.5 text-xs font-semibold transition border-b-2 ${activeTab === 'posts' ? 'border-brand-500 text-brand-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('polls')}
          className={`flex-1 py-2.5 text-xs font-semibold transition border-b-2 ${activeTab === 'polls' ? 'border-brand-500 text-brand-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          Polls {polls.length > 0 && `(${polls.length})`}
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {activeTab === 'posts' && (
          <>
            {/* Posts loading skeleton */}
            {postsLoading && posts.length === 0 && (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-zinc-100">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-100 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-zinc-100 rounded-full w-1/3" />
                        <div className="h-2.5 bg-zinc-100 rounded-full w-full" />
                        <div className="h-2.5 bg-zinc-100 rounded-full w-4/5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!postsLoading && posts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <MessageSquare size={32} className="mb-3 opacity-40" />
                <p className="text-sm font-medium text-zinc-500">No posts yet</p>
                <p className="text-xs mt-1">Be the first to share something</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.2) }}
                  className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 shrink-0">
                      {nameToInitials(post.author?.name || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-800">{post.author?.name}</span>
                        <span className="text-xs text-zinc-400">{relativeTime(post.createdAt)}</span>
                      </div>
                      <p className="text-sm text-zinc-700 leading-relaxed mt-1">{post.content}</p>

                      {/* Post attachment */}
                      {post.attachmentUrl && (
                        <AttachmentPreview url={post.attachmentUrl} type={post.attachmentType} />
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1.5 text-xs font-medium transition ${post.liked ? 'text-red-500' : 'text-zinc-400 hover:text-red-400'}`}
                        >
                          <Heart size={13} fill={post.liked ? 'currentColor' : 'none'} />
                          {post.likesCount}
                        </button>
                        <button
                          onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-brand-500 transition"
                        >
                          <MessageSquare size={13} />
                          {post.repliesCount > 0 && post.repliesCount} Reply
                          {expandedPostId === post.id
                            ? <ChevronDown size={11} className="rotate-180 transition-transform" />
                            : <ChevronDown size={11} className="transition-transform" />
                          }
                        </button>
                        {(canDeleteAny || post.authorId === user?.id) && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="ml-auto flex items-center gap-1 text-xs text-zinc-300 hover:text-red-400 transition"
                            title="Delete post"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reply thread */}
                  <AnimatePresence>
                    {expandedPostId === post.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <ReplyThread communityId={id} postId={post.id} userId={user?.id || ''} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}

        {activeTab === 'polls' && (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => setShowPollCreator(v => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-xl transition shadow-sm"
              >
                <Plus size={15} /> {showPollCreator ? 'Cancel' : 'Create Poll'}
              </button>
            </div>

            {showPollCreator && (
              <PollCreator
                communityId={id}
                onCreated={poll => setPolls(prev => [poll, ...prev])}
                onClose={() => setShowPollCreator(false)}
              />
            )}

            {pollLoadError && (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                <p className="text-sm text-red-400 font-medium">Couldn't load polls</p>
                <button
                  onClick={() => {
                    setPollLoadError(false);
                    communityApi.getPolls(id)
                      .then((res: any) => setPolls(res?.data?.data ?? []))
                      .catch(() => setPollLoadError(true));
                  }}
                  className="mt-2 text-xs text-brand-500 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {!pollLoadError && polls.length === 0 && !showPollCreator && (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <BarChart2 size={32} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">No polls yet</p>
                <p className="text-xs mt-1">Create one above to get members voting</p>
              </div>
            )}

            {polls.map(poll => (
              <PollCard key={poll.id} poll={poll} communityId={id} onVote={handleVote} />
            ))}
          </>
        )}
      </div>

      {/* Compose bar (posts only) */}
      {activeTab === 'posts' && (
        <div className="px-4 py-3 bg-white border-t border-zinc-100 shrink-0 space-y-2">
          {/* Pending attachment preview */}
          {postAttachFile && (
            <div className="flex items-center gap-2 bg-zinc-100 rounded-xl px-3 py-2 border border-zinc-200">
              {postAttachPreviewUrl ? (
                <img src={postAttachPreviewUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
              ) : (
                <Paperclip size={13} className="text-zinc-400 shrink-0" />
              )}
              <span className="text-xs text-zinc-600 font-medium truncate max-w-[180px]">{postAttachFile.name}</span>
              <button
                onClick={() => {
                  if (postAttachPreviewUrl) URL.revokeObjectURL(postAttachPreviewUrl);
                  setPostAttachPreviewUrl(null);
                  setPostAttachFile(null);
                  setPostAttachType(null);
                }}
                className="ml-auto text-zinc-400 hover:text-red-400 transition"
              >
                <X size={13} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 bg-zinc-50 rounded-2xl px-4 py-2 border border-zinc-200 focus-within:border-brand-300 transition">
            {isPostMicActive ? (
              <div className="flex-1 flex items-center gap-2 min-h-[24px]">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-sm font-mono text-red-500 tabular-nums">{postMicTime}</span>
                <span className="text-xs text-zinc-400">Tap mic to stop</span>
              </div>
            ) : (
              <textarea
                ref={postTextareaRef}
                value={newPost}
                onChange={e => {
                  setNewPost(e.target.value);
                  const ta = e.target;
                  ta.style.height = 'auto';
                  ta.style.height = Math.min(ta.scrollHeight, 80) + 'px';
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
                placeholder={`Share something with ${pod?.name ?? 'the pod'}…`}
                rows={1}
                className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none leading-relaxed overflow-hidden"
                style={{ minHeight: '24px', maxHeight: '80px' }}
              />
            )}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handlePostAttach('IMAGE')} disabled={isPostMicActive} className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-brand-500 disabled:opacity-40 transition" title="Attach image">
                <ImageIcon size={15} />
              </button>
              <button
                onClick={handlePostMic}
                className={`p-1 rounded-lg transition ${isPostMicActive ? 'text-red-500' : 'text-zinc-400 hover:text-brand-500 hover:bg-zinc-200'}`}
                title={isPostMicActive ? 'Stop recording' : 'Record voice note'}
              >
                <Mic size={15} className={isPostMicActive ? 'animate-pulse' : ''} />
              </button>
              <button onClick={() => handlePostAttach('FILE')} disabled={isPostMicActive} className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-brand-500 disabled:opacity-40 transition" title="Attach file">
                <Paperclip size={15} />
              </button>
              <button
                onClick={handlePost}
                disabled={(!newPost.trim() && !postAttachFile) || sending}
                className="w-8 h-8 rounded-full bg-brand-500 disabled:bg-zinc-200 flex items-center justify-center transition"
              >
                {sending
                  ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Send size={13} className={(newPost.trim() || postAttachFile) ? 'text-white' : 'text-zinc-400'} />
                }
              </button>
            </div>
          </div>
          <input
            ref={postFileRef}
            type="file"
            accept={postFileAccept}
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                setPostAttachFile(file);
                if (file.type.startsWith('image/')) {
                  if (postAttachPreviewUrl) URL.revokeObjectURL(postAttachPreviewUrl);
                  setPostAttachPreviewUrl(URL.createObjectURL(file));
                } else {
                  if (postAttachPreviewUrl) URL.revokeObjectURL(postAttachPreviewUrl);
                  setPostAttachPreviewUrl(null);
                }
              }
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* Click outside menu */}
      {showMenu && <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />}

      {/* Member management sheet */}
      {showMemberSheet && isAdmin && (
        <MemberSheet
          communityId={id}
          members={members}
          joinRequests={joinRequests}
          myId={user?.id || ''}
          requiresApproval={pod?.requiresApproval ?? false}
          onClose={() => setShowMemberSheet(false)}
          onRoleChange={handleRoleChange}
          onRemove={handleRemoveMember}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
