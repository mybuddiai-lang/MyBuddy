'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Heart, Users, Hash, Pin, MoreHorizontal, MessageSquare,
  Paperclip, Mic, Image as ImageIcon, FileText, BarChart2, X, Plus, ChevronDown,
  Check, LogOut, UserCog, Clock, Trash2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { communityApi, CommunityPost, CommunityPostReply, CommunityPoll, CommunityMember, JoinRequest } from '@/lib/api/community';
import { useAuthStore } from '@/lib/store/auth.store';
import { useCommunitySocket } from '@/lib/hooks/use-community-socket';
import { useVoiceRecorder } from '@/lib/hooks/use-voice-recorder';
import toast from 'react-hot-toast';

// ─── Shared attachment types (mirrors chat pattern) ───────────────────────────

type AttachmentType = 'IMAGE' | 'FILE' | 'VOICE';
type UploadStatus = 'uploading' | 'done' | 'error';

interface PendingAttachment {
  file: File;
  name: string;
  type: AttachmentType;
  previewUrl?: string;
  uploadedUrl?: string;
  status: UploadStatus;
}

// ─── Pending attachment preview card (same pattern as chat) ───────────────────

function AttachmentPreviewCard({
  attachment,
  onRemove,
  onRetry,
  compact = false,
}: {
  attachment: PendingAttachment;
  onRemove: () => void;
  onRetry: () => void;
  compact?: boolean;
}) {
  const { type, previewUrl, name, status } = attachment;
  const uploading = status === 'uploading';
  const failed = status === 'error';
  const maxH = compact ? 'max-h-28' : 'max-h-36';
  const maxW = compact ? 'max-w-[200px]' : 'max-w-[240px]';

  return (
    <div className="relative inline-block">
      {type === 'IMAGE' && previewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-zinc-200 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={name}
            className={`block ${maxH} ${maxW} w-auto object-cover transition-opacity duration-200 ${uploading || failed ? 'opacity-60' : 'opacity-100'}`}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-6 h-6 border-[3px] border-white/70 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {failed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40">
              <AlertCircle size={16} className="text-white" />
              <button
                onClick={onRetry}
                className="flex items-center gap-1 text-xs text-white font-medium bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition"
              >
                <RefreshCw size={10} /> Retry
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2 border border-zinc-200 dark:border-zinc-700">
          <Paperclip size={compact ? 11 : 13} className="text-zinc-400 shrink-0" />
          <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate max-w-[160px]">{name}</span>
          {uploading && (
            <div className="w-3 h-3 border-2 border-zinc-400 border-t-brand-500 rounded-full animate-spin shrink-0" />
          )}
          {failed && (
            <button onClick={onRetry} title="Retry">
              <RefreshCw size={11} className="text-red-400 hover:text-red-600 transition shrink-0" />
            </button>
          )}
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shadow-sm hover:bg-zinc-600 transition"
      >
        <X size={10} className="text-white" />
      </button>
    </div>
  );
}

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

// ─── Image lightbox ───────────────────────────────────────────────────────────

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
      >
        <X size={20} className="text-white" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Full size"
        className="max-w-full max-h-full object-contain rounded-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

// ─── Attachment preview ───────────────────────────────────────────────────────
// Mirrors the fallback pattern in message-bubble.tsx:
//   1. Try previewUrl (local blob — immediate display, current session only)
//   2. On error, switch to remote url (R2 CDN)
//   3. If remote also fails → show "unavailable" chip

function AttachmentPreview({ url, previewUrl, type }: {
  url: string;
  previewUrl?: string;
  type?: 'FILE' | 'IMAGE' | 'VOICE';
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  if (!url && !previewUrl) return null;

  const imgSrc = (!useFallback && previewUrl) ? previewUrl : url;

  if (type === 'IMAGE' && !imgError) {
    return (
      <>
        <button onClick={() => setLightbox(true)} className="block mt-2 text-left focus:outline-none">
          <div className={`relative rounded-xl overflow-hidden bg-zinc-100 ${imgLoaded ? '' : 'min-h-[120px]'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt="attachment"
              className={`max-w-[240px] w-full object-cover rounded-xl transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                if (!useFallback && previewUrl) {
                  // Blob URL failed (e.g. page reloaded) — switch to remote URL
                  setUseFallback(true);
                  setImgLoaded(false);
                } else {
                  setImgError(true);
                }
              }}
            />
            {!imgLoaded && !imgError && (
              <div className="w-[240px] h-[140px] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {imgLoaded && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition rounded-xl flex items-center justify-center">
                <span className="opacity-0 hover:opacity-100 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-lg transition">
                  View full
                </span>
              </div>
            )}
          </div>
        </button>
        {lightbox && <ImageLightbox src={url || previewUrl!} onClose={() => setLightbox(false)} />}
      </>
    );
  }

  if (type === 'IMAGE' && imgError) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg px-3 py-2 border border-zinc-100 dark:border-zinc-700">
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
      className="mt-2 flex items-center gap-2 text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 rounded-lg px-3 py-2 border border-brand-100 dark:border-brand-800 w-fit">
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
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [fileAccept, setFileAccept] = useState('image/*,audio/*,*/*');
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback(async (file: File) => {
    try {
      const { url, type: detectedType } = await communityApi.uploadAttachment(file);
      setPendingAttachment(prev =>
        prev?.file === file ? { ...prev, uploadedUrl: url, type: detectedType, status: 'done' } : prev,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      toast.error(msg);
      setPendingAttachment(prev => prev?.file === file ? { ...prev, status: 'error' } : prev);
    }
  }, []);

  const { isRecording: isMicActive, recordingTime: micTime, toggleRecording } = useVoiceRecorder((file) => {
    setPendingAttachment(prev => { if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl); return null; });
    setPendingAttachment({ file, name: file.name, type: 'VOICE', status: 'uploading' });
    doUpload(file);
  });

  const handleMic = async () => {
    try { await toggleRecording(); }
    catch { toast.error('Could not access microphone. Please check permissions.'); }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadError(false);
    communityApi.getReplies(communityId, postId)
      .then((res: any) => setReplies(res?.data?.data ?? []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [communityId, postId]);

  const handleAttach = (type: 'FILE' | 'IMAGE' | 'VOICE') => {
    const accept = type === 'IMAGE' ? 'image/*' : type === 'VOICE' ? 'audio/*' : '*/*';
    setFileAccept(accept);
    requestAnimationFrame(() => fileRef.current?.click());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 25 MB.');
      return;
    }
    setPendingAttachment(prev => { if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl); return null; });
    const type: AttachmentType = file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('audio/') ? 'VOICE' : 'FILE';
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setPendingAttachment({ file, name: file.name, type, previewUrl, status: 'uploading' });
    doUpload(file);
  };

  const handleSend = async () => {
    if (pendingAttachment?.status === 'uploading') {
      toast('Upload in progress — please wait.', { icon: '⏳' });
      return;
    }
    if (pendingAttachment?.status === 'error') {
      toast.error('Attachment upload failed — retry or remove it before sending.');
      return;
    }
    if (!replyText.trim() && !pendingAttachment) return;
    setSending(true);

    const attachment = pendingAttachment;
    const resolvedUrl = attachment?.uploadedUrl;
    const resolvedType = attachment?.type;

    const optimistic: CommunityPostReply = {
      id: `local-${Date.now()}`,
      postId,
      authorId: userId,
      author: { id: userId, name: 'You' },
      content: replyText.trim(),
      attachmentUrl: resolvedUrl,
      attachmentType: resolvedUrl ? resolvedType : undefined,
      previewUrl: resolvedType === 'IMAGE' ? attachment?.previewUrl : undefined,
      createdAt: new Date().toISOString(),
    };
    setReplies(prev => [...prev, optimistic]);
    setReplyText('');
    setPendingAttachment(null);

    try {
      const res = await communityApi.createReply(communityId, postId, {
        content: optimistic.content,
        attachmentUrl: resolvedUrl,
        attachmentType: resolvedType ?? undefined,
      });
      const created = (res as any)?.data?.data;
      if (created?.id) {
        // Swap optimistic reply with the real one; preserve previewUrl so the image
        // doesn't flash while the R2 URL loads for the sender.
        setReplies(prev => prev.map(r =>
          r.id === optimistic.id ? { ...created, previewUrl: optimistic.previewUrl } : r,
        ));
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
    <div className="mt-3 space-y-2 px-2">
      {loading && <p className="text-xs text-zinc-400 dark:text-zinc-500 pl-2">Loading replies…</p>}
      {loadError && <p className="text-xs text-red-400 pl-2">Could not load replies. Please try again.</p>}
      {replies.map(reply => {
        const isOwn = reply.authorId === userId;
        return (
          <div key={reply.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-1.5`}>
            {!isOwn && (
              <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-500 dark:text-zinc-300 shrink-0">
                {nameToInitials(reply.author?.name || '?')}
              </div>
            )}
            <div className={`flex flex-col max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
              {!isOwn && (
                <span className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 mb-0.5 px-1">
                  {reply.author?.name}
                </span>
              )}
              <div className={`rounded-xl px-3 py-2 ${
                isOwn
                  ? 'bg-brand-500 rounded-tr-sm'
                  : 'bg-white dark:bg-zinc-700 rounded-tl-sm border border-zinc-100 dark:border-zinc-600'
              }`}>
                <p className={`text-xs leading-relaxed ${isOwn ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`}>
                  {reply.content}
                </p>
                {(reply.attachmentUrl || reply.previewUrl) && (
                  <AttachmentPreview
                    url={reply.attachmentUrl ?? ''}
                    previewUrl={reply.previewUrl}
                    type={reply.attachmentType}
                  />
                )}
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5 px-1">
                {relativeTime(reply.createdAt)}
              </span>
            </div>
          </div>
        );
      })}

      {/* Pending attachment preview */}
      {pendingAttachment && (
        <AttachmentPreviewCard
          attachment={pendingAttachment}
          compact
          onRemove={() => setPendingAttachment(prev => { if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl); return null; })}
          onRetry={() => {
            if (!pendingAttachment) return;
            setPendingAttachment(prev => prev ? { ...prev, status: 'uploading' } : null);
            doUpload(pendingAttachment.file);
          }}
        />
      )}

      {/* Reply compose */}
      <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 focus-within:border-brand-300 dark:focus-within:border-brand-600 transition">
        {isMicActive ? (
          <div className="flex-1 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-xs font-mono text-red-500 tabular-nums">{micTime}</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Tap mic to stop</span>
          </div>
        ) : (
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Write a reply…"
            rows={1}
            className="flex-1 bg-transparent text-xs text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none focus:outline-none leading-relaxed overflow-hidden"
            style={{ height: '20px' }}
          />
        )}

        {/* Attach button group */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => handleAttach('IMAGE')} disabled={isMicActive} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-brand-500 disabled:opacity-40 transition" title="Attach image">
            <ImageIcon size={13} />
          </button>
          <button
            onClick={handleMic}
            className={`p-1 rounded-lg transition ${isMicActive ? 'text-red-500' : 'text-zinc-400 hover:text-brand-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
            title={isMicActive ? 'Stop recording' : 'Record voice note'}
          >
            <Mic size={13} className={isMicActive ? 'animate-pulse' : ''} />
          </button>
          <button onClick={() => handleAttach('FILE')} disabled={isMicActive} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-brand-500 disabled:opacity-40 transition" title="Attach file">
            <Paperclip size={13} />
          </button>
          <button
            onClick={handleSend}
            disabled={(!replyText.trim() && !pendingAttachment) || sending}
            className="w-6 h-6 rounded-full bg-brand-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 flex items-center justify-center transition"
          >
            {sending
              ? <div className="w-2.5 h-2.5 border border-white/40 border-t-white rounded-full animate-spin" />
              : <Send size={10} className={replyText.trim() || pendingAttachment ? 'text-white' : 'text-zinc-400'} />
            }
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept={fileAccept} className="hidden" onChange={handleFileChange} />
    </div>
  );
}

// ─── Poll card ────────────────────────────────────────────────────────────────

function PollCard({
  poll, communityId, onVote, onDelete, canDelete,
}: {
  poll: CommunityPoll;
  communityId: string;
  onVote: (pollId: string, optionId: string) => void;
  onDelete?: (pollId: string) => void;
  canDelete?: boolean;
}) {
  const totalVotes = poll.options.reduce((s, o) => s + o.votesCount, 0);
  const hasVoted = poll.myVotedOptionId !== null;
  const expired = poll.endsAt ? new Date(poll.endsAt) < new Date() : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-800 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-700 shadow-card"
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={14} className="text-brand-500" />
        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">Poll</span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">· {poll.author?.name}</span>
        <div className="ml-auto flex items-center gap-2">
          {expired && <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Ended</span>}
          {!expired && poll.endsAt && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
              <Clock size={9} /> Ends {relativeTime(poll.endsAt)}
            </span>
          )}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(poll.id)}
              className="p-0.5 text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition"
              title="Delete poll"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-3">{poll.question}</p>

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
                isMyVote
                  ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/30 dark:border-brand-600'
                  : 'border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700/50 hover:border-brand-300 dark:hover:border-brand-500'
              } ${hasVoted || expired ? 'cursor-default' : 'cursor-pointer'}`}>
                {/* Progress bar */}
                {hasVoted && (
                  <div
                    className="absolute inset-0 rounded-xl bg-brand-100 dark:bg-brand-700/30 opacity-40 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className={`relative text-xs font-medium ${isMyVote ? 'text-brand-700 dark:text-brand-300' : 'text-zinc-700 dark:text-zinc-200'}`}>
                  {option.text}
                  {isMyVote && <Check size={11} className="inline ml-1 text-brand-500 dark:text-brand-400" />}
                </span>
                {hasVoted && (
                  <span className="relative text-xs font-semibold text-zinc-500 dark:text-zinc-400">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 text-right">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
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
  const searchParams = useSearchParams();
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
  const [pendingPostAttachment, setPendingPostAttachment] = useState<PendingAttachment | null>(null);
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

  const doPostUpload = useCallback(async (file: File) => {
    try {
      const { url, type: detectedType } = await communityApi.uploadAttachment(file);
      setPendingPostAttachment(prev =>
        prev?.file === file ? { ...prev, uploadedUrl: url, type: detectedType, status: 'done' } : prev,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      toast.error(msg);
      setPendingPostAttachment(prev => prev?.file === file ? { ...prev, status: 'error' } : prev);
    }
  }, []);

  const { isRecording: isPostMicActive, recordingTime: postMicTime, toggleRecording: togglePostMic } = useVoiceRecorder((file) => {
    setPendingPostAttachment(prev => { if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl); return null; });
    setPendingPostAttachment({ file, name: file.name, type: 'VOICE', status: 'uploading' });
    doPostUpload(file);
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

  // Revoke pending attachment blob URL on cleanup
  useEffect(() => {
    return () => { setPendingPostAttachment(prev => { if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl); return null; }); };
  }, []);

  // Auto-scroll to latest post whenever the list changes, but only if the user
  // is already at (or near) the bottom — so manual upward scrolling isn't hijacked
  useEffect(() => {
    if (activeTab === 'posts' && isAtBottom.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
    }
  }, [posts, activeTab]);

  // Deep-link: ?post=<id> — scroll to the post and open its reply thread
  useEffect(() => {
    const postId = searchParams.get('post');
    if (!postId || posts.length === 0 || activeTab !== 'posts') return;
    // Small delay so the post elements have been painted
    const t = setTimeout(() => {
      const el = document.getElementById(`post-${postId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-brand-400', 'ring-offset-1');
        setTimeout(() => el.classList.remove('ring-2', 'ring-brand-400', 'ring-offset-1'), 2500);
      }
      setExpandedPostId(postId);
    }, 300);
    return () => clearTimeout(t);
  }, [posts, searchParams, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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
    onDeletePoll: ({ pollId }) => {
      setPolls(prev => prev.filter(p => p.id !== pollId));
    },
  });

  // Load data
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPostsLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPodLoading(true);

    // Posts — API returns newest-first; reverse so oldest is at top, newest at bottom
    communityApi.getPosts(id)
      .then((res: any) => {
        const apiPosts: CommunityPost[] = (res?.data?.data ?? []).slice().reverse();
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

    // Deep-link: ?tab=polls switches tab
    const tabParam = searchParams.get('tab');
    if (tabParam === 'polls') setActiveTab('polls');
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (pendingPostAttachment?.status === 'uploading') {
      toast('Upload in progress — please wait.', { icon: '⏳' });
      return;
    }
    if (pendingPostAttachment?.status === 'error') {
      toast.error('Attachment upload failed — retry or remove it before posting.');
      return;
    }
    if (!newPost.trim() && !pendingPostAttachment) return;

    const content = newPost.trim();
    const attachment = pendingPostAttachment;
    const resolvedUrl = attachment?.uploadedUrl;
    const resolvedType = attachment?.type;

    setSending(true);

    const optimistic: any = {
      id: `local-${Date.now()}`,
      authorId: user?.id || '',
      author: { id: user?.id || '', name: user?.name || 'You' },
      content,
      attachmentUrl: resolvedUrl,
      attachmentType: resolvedUrl ? resolvedType : undefined,
      previewUrl: resolvedType === 'IMAGE' ? attachment?.previewUrl : undefined,
      likesCount: 0,
      commentsCount: 0,
      repliesCount: 0,
      liked: false,
      createdAt: new Date().toISOString(),
    };
    isAtBottom.current = true;
    setPosts(prev => [...prev, optimistic]);
    setNewPost('');
    if (postTextareaRef.current) postTextareaRef.current.style.height = '24px';
    setPendingPostAttachment(null);

    try {
      const res = await communityApi.createPost(id, {
        content,
        attachmentUrl: resolvedUrl,
        attachmentType: resolvedType ?? undefined,
      });
      const created = (res as any)?.data?.data;
      if (created?.id) {
        setPosts(prev => {
          // Replace optimistic post, preserving blob previewUrl so the image stays
          // visible without a flash while the R2 URL confirms. Deduplicate in case
          // the socket already added the real post before the API response arrived.
          const replaced = prev.map(p =>
            p.id === optimistic.id
              ? { ...created, liked: false, previewUrl: optimistic.previewUrl }
              : p,
          );
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

  const handleDeletePoll = async (pollId: string) => {
    setPolls(prev => prev.filter(p => p.id !== pollId)); // optimistic
    try {
      await communityApi.deletePoll(id, pollId);
    } catch {
      toast.error('Could not delete poll');
      communityApi.getPolls(id).then((res: any) => setPolls(res?.data?.data ?? [])).catch(() => {});
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
      <div className="px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition shrink-0">
          <ArrowLeft size={16} className="text-zinc-600 dark:text-zinc-300" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
          <Hash size={16} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          {podLoading && !pod ? (
            <div className="space-y-1.5 animate-pulse">
              <div className="h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-full w-32" />
              <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full w-24" />
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{pod?.name ?? 'Pod'}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                <Users size={9} /> {pod?.memberCount ?? 0} members · {pod?.field ?? 'General'}
                {pod?.myRole && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 text-[9px] font-semibold">{pod.myRole}</span>}
              </p>
            </>
          )}
        </div>

        {/* More menu */}
        <div className="relative">
          <button onClick={() => setShowMenu(v => !v)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition p-1">
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 top-8 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1 min-w-[160px] z-20"
              >
                {isAdmin && (
                  <button
                    onClick={() => { setShowMemberSheet(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                  >
                    <UserCog size={14} /> Manage Members
                  </button>
                )}
                <button
                  onClick={() => { handleLeave(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <LogOut size={14} /> Leave Pod
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-2.5 text-xs font-semibold transition border-b-2 ${activeTab === 'posts' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('polls')}
          className={`flex-1 py-2.5 text-xs font-semibold transition border-b-2 ${activeTab === 'polls' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
        >
          Polls {polls.length > 0 && `(${polls.length})`}
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-zinc-50 dark:bg-zinc-950">
        {activeTab === 'posts' && (
          <>
            {/* Posts loading skeleton */}
            {postsLoading && posts.length === 0 && (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {i % 2 !== 0 && <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />}
                    <div className="space-y-1.5 max-w-[60%]">
                      <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-20" />
                      <div className={`h-12 rounded-2xl ${i % 2 === 0 ? 'bg-brand-200 dark:bg-brand-900/40' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!postsLoading && posts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-500">
                <MessageSquare size={32} className="mb-3 opacity-40" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No posts yet</p>
                <p className="text-xs mt-1">Be the first to share something</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {posts.map((post, i) => {
                const isOwn = post.authorId === user?.id;
                return (
                  <motion.div
                    id={`post-${post.id}`}
                    key={post.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.2) }}
                  >
                    {/* Bubble row */}
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                      {/* Avatar — others only */}
                      {!isOwn && (
                        <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 shrink-0 mb-1">
                          {nameToInitials(post.author?.name || '?')}
                        </div>
                      )}

                      <div className={`flex flex-col max-w-[82%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        {/* Name + time */}
                        <div className="flex items-center gap-1.5 px-1 mb-1">
                          {!isOwn && (
                            <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                              {post.author?.name}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {relativeTime(post.createdAt)}
                          </span>
                        </div>

                        {/* Bubble */}
                        <div className={`rounded-2xl px-4 py-3 ${
                          isOwn
                            ? 'bg-brand-500 rounded-tr-sm'
                            : 'bg-white dark:bg-zinc-800 rounded-tl-sm border border-zinc-100 dark:border-zinc-700 shadow-sm'
                        }`}>
                          <p className={`text-sm leading-relaxed ${isOwn ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`}>
                            {post.content}
                          </p>
                          {(post.attachmentUrl || post.previewUrl) && (
                            <AttachmentPreview
                              url={post.attachmentUrl ?? ''}
                              previewUrl={post.previewUrl}
                              type={post.attachmentType}
                            />
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-1.5 px-1">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1 text-[11px] font-medium transition ${post.liked ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500 hover:text-red-400'}`}
                          >
                            <Heart size={12} fill={post.liked ? 'currentColor' : 'none'} />
                            {post.likesCount > 0 && post.likesCount}
                          </button>
                          <button
                            onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                            className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 hover:text-brand-500 transition"
                          >
                            <MessageSquare size={12} />
                            {post.repliesCount > 0 && post.repliesCount} Reply
                            {expandedPostId === post.id
                              ? <ChevronDown size={10} className="rotate-180 transition-transform" />
                              : <ChevronDown size={10} className="transition-transform" />
                            }
                          </button>
                          {(canDeleteAny || isOwn) && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="text-[11px] text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition"
                              title="Delete post"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reply thread — full width below the bubble */}
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
                );
              })}
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
              <div className="flex flex-col items-center justify-center py-10 text-zinc-400 dark:text-zinc-500">
                <p className="text-sm text-red-400 font-medium">Couldn&apos;t load polls</p>
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
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-500">
                <BarChart2 size={32} className="mb-3 opacity-40" />
                <p className="text-sm font-medium dark:text-zinc-400">No polls yet</p>
                <p className="text-xs mt-1">Create one above to get members voting</p>
              </div>
            )}

            {polls.map(poll => (
              <PollCard
                key={poll.id}
                poll={poll}
                communityId={id}
                onVote={handleVote}
                onDelete={handleDeletePoll}
                canDelete={canDeleteAny || poll.authorId === user?.id}
              />
            ))}
          </>
        )}
      </div>

      {/* Compose bar (posts only) */}
      {activeTab === 'posts' && (
        <div className="px-4 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 shrink-0 space-y-2">
          {/* Pending attachment preview */}
          {pendingPostAttachment && (
            <AttachmentPreviewCard
              attachment={pendingPostAttachment}
              onRemove={() => setPendingPostAttachment(prev => { if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl); return null; })}
              onRetry={() => {
                if (!pendingPostAttachment) return;
                setPendingPostAttachment(prev => prev ? { ...prev, status: 'uploading' } : null);
                doPostUpload(pendingPostAttachment.file);
              }}
            />
          )}

          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-2xl px-4 py-2 border border-zinc-200 dark:border-zinc-700 focus-within:border-brand-300 dark:focus-within:border-brand-600 transition">
            {isPostMicActive ? (
              <div className="flex-1 flex items-center gap-2 min-h-[24px]">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-sm font-mono text-red-500 tabular-nums">{postMicTime}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Tap mic to stop</span>
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
                className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none focus:outline-none leading-relaxed overflow-hidden"
                style={{ minHeight: '24px', maxHeight: '80px' }}
              />
            )}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handlePostAttach('IMAGE')} disabled={isPostMicActive} className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-brand-500 disabled:opacity-40 transition" title="Attach image">
                <ImageIcon size={15} />
              </button>
              <button
                onClick={handlePostMic}
                className={`p-1 rounded-lg transition ${isPostMicActive ? 'text-red-500' : 'text-zinc-400 hover:text-brand-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                title={isPostMicActive ? 'Stop recording' : 'Record voice note'}
              >
                <Mic size={15} className={isPostMicActive ? 'animate-pulse' : ''} />
              </button>
              <button onClick={() => handlePostAttach('FILE')} disabled={isPostMicActive} className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-brand-500 disabled:opacity-40 transition" title="Attach file">
                <Paperclip size={15} />
              </button>
              <button
                onClick={handlePost}
                disabled={(!newPost.trim() && !pendingPostAttachment) || sending}
                className="w-8 h-8 rounded-full bg-brand-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 flex items-center justify-center transition"
              >
                {sending
                  ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Send size={13} className={(newPost.trim() || pendingPostAttachment) ? 'text-white' : 'text-zinc-400'} />
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
              e.target.value = '';
              if (!file) return;
              if (file.size > 25 * 1024 * 1024) {
                toast.error('File is too large. Maximum size is 25 MB.');
                return;
              }
              setPendingPostAttachment(prev => { if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl); return null; });
              const type: AttachmentType = file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('audio/') ? 'VOICE' : 'FILE';
              const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
              setPendingPostAttachment({ file, name: file.name, type, previewUrl, status: 'uploading' });
              doPostUpload(file);
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
