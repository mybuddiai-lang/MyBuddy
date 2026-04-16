'use client';

import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api/users';

type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading';

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    const perm = Notification.permission;
    if (perm === 'denied') { setState('denied'); return; }

    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setState(existing ? 'subscribed' : 'unsubscribed');
    }).catch(() => setState('unsubscribed'));
  }, []);

  const subscribe = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      // Explicitly request notification permission before attempting to subscribe.
      // Without this, pushManager.subscribe() silently fails on some browsers when
      // the permission is 'default' (not yet asked).
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setState('denied');
        setError('Notification permission was denied. Enable it in browser settings.');
        return;
      }
      if (permission !== 'granted') {
        setState('unsubscribed');
        return;
      }

      const publicKey = await usersApi.getVapidPublicKey();
      if (!publicKey) throw new Error('Push not configured on server');

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await usersApi.subscribePush(subscription.toJSON() as PushSubscriptionJSON);
      setState('subscribed');
    } catch (err: any) {
      setError(err.message || 'Failed to enable notifications');
      setState('unsubscribed');
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setState('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await usersApi.unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState('unsubscribed');
    } catch {
      setState('subscribed');
    }
  }, []);

  return { state, error, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}
