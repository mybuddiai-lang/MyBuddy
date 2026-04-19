'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface GlobalSocketHandlers {
  onReminderDue?: (reminder: { id?: string; title?: string; description?: string; noteTitle?: string; type?: string; scheduledFor?: string }) => void;
  onMemberJoined?: (data: { communityId: string; communityName: string; userName: string }) => void;
  onJoinApproved?: (data: { communityId: string; communityName: string }) => void;
  onReplyOnPost?: (data: { communityId: string; postId: string; communityName: string; replyerName: string; content: string }) => void;
  onNewCommunity?: (data: { id: string; name: string; field: string }) => void;
}

export function useGlobalSocket(handlers: GlobalSocketHandlers) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref fresh without triggering re-connects
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('buddi_access_token')
      : null;
    if (!token) return;

    const socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('reminder:due', (data: any) => {
      try { handlersRef.current.onReminderDue?.(data); } catch { /* never crash the socket */ }
    });

    socket.on('community:member_joined', (data: any) => {
      try { handlersRef.current.onMemberJoined?.(data); } catch { /* never crash the socket */ }
    });

    socket.on('community:join_approved', (data: any) => {
      try { handlersRef.current.onJoinApproved?.(data); } catch { /* never crash the socket */ }
    });

    socket.on('community:reply_on_post', (data: any) => {
      try { handlersRef.current.onReplyOnPost?.(data); } catch { /* never crash the socket */ }
    });

    socket.on('community:new', (data: any) => {
      try { handlersRef.current.onNewCommunity?.(data); } catch { /* never crash the socket */ }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
}
