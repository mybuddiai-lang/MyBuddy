'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { CommunityPost, CommunityPostReply, CommunityPoll } from '@/lib/api/community';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface CommunitySocketHandlers {
  onNewPost?: (post: CommunityPost) => void;
  onNewReply?: (data: { postId: string; reply: CommunityPostReply }) => void;
  onDeletePost?: (data: { postId: string }) => void;
  onDeleteReply?: (data: { postId: string; replyId: string }) => void;
  onNewPoll?: (poll: CommunityPoll) => void;
  onPollUpdate?: (poll: CommunityPoll) => void;
}

export function useCommunitySocket(communityId: string, handlers: CommunitySocketHandlers) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref fresh without re-connecting
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!communityId) return;

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('buddi_access_token')
      : null;

    const socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('community:join', communityId);
    });

    socket.on('community:new_post', (post: CommunityPost) => {
      handlersRef.current.onNewPost?.(post);
    });

    socket.on('community:new_reply', (data: { postId: string; reply: CommunityPostReply }) => {
      handlersRef.current.onNewReply?.(data);
    });

    socket.on('community:delete_post', (data: { postId: string }) => {
      handlersRef.current.onDeletePost?.(data);
    });

    socket.on('community:delete_reply', (data: { postId: string; replyId: string }) => {
      handlersRef.current.onDeleteReply?.(data);
    });

    socket.on('community:new_poll', (poll: CommunityPoll) => {
      handlersRef.current.onNewPoll?.(poll);
    });

    socket.on('community:poll_update', (poll: CommunityPoll) => {
      handlersRef.current.onPollUpdate?.(poll);
    });

    return () => {
      socket.emit('community:leave', communityId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [communityId]);
}
