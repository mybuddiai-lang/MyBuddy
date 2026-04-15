'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface GlobalSocketHandlers {
  onReminderDue?: (reminder: { title?: string; body?: string; noteTitle?: string }) => void;
  onMemberJoined?: (data: { communityId: string; communityName: string; userName: string }) => void;
  onJoinApproved?: (data: { communityId: string; communityName: string }) => void;
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
      handlersRef.current.onReminderDue?.(data);
    });

    socket.on('community:member_joined', (data: any) => {
      handlersRef.current.onMemberJoined?.(data);
    });

    socket.on('community:join_approved', (data: any) => {
      handlersRef.current.onJoinApproved?.(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
}
