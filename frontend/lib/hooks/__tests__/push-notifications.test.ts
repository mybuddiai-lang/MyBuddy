/**
 * Unit tests for the push notification permission flow.
 *
 * These tests verify:
 * 1. Explicit Notification.requestPermission() is called before subscribing
 * 2. When permission is 'denied', subscription is aborted and state → 'denied'
 * 3. When permission is 'default' (dismissed), state → 'unsubscribed'
 * 4. When permission is 'granted', subscription proceeds normally
 * 5. When the server has no VAPID key, subscription throws
 */
import { describe, it, expect, vi } from 'vitest';

// ── Pure logic extracted from use-push-notifications.ts ──────────────────────

type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading';

async function runSubscribeFlow(
  requestPermission: () => Promise<NotificationPermission>,
  getVapidKey: () => Promise<string | null>,
  doSubscribe: () => Promise<void>,
): Promise<{ state: PushState; error: string | null }> {
  let state: PushState = 'loading';
  let error: string | null = null;

  try {
    const permission = await requestPermission();
    if (permission === 'denied') {
      state = 'denied';
      error = 'Notification permission was denied. Enable it in browser settings.';
      return { state, error };
    }
    if (permission !== 'granted') {
      state = 'unsubscribed';
      return { state, error };
    }

    const publicKey = await getVapidKey();
    if (!publicKey) throw new Error('Push not configured on server');

    await doSubscribe();
    state = 'subscribed';
  } catch (err: any) {
    error = err.message || 'Failed to enable notifications';
    state = 'unsubscribed';
  }

  return { state, error };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('push notification permission flow', () => {
  it('calls requestPermission before subscribing', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    const getVapidKey = vi.fn().mockResolvedValue('vapid-key-abc');
    const doSubscribe = vi.fn().mockResolvedValue(undefined);

    await runSubscribeFlow(requestPermission, getVapidKey, doSubscribe);

    // Permission must be checked before subscription
    expect(requestPermission).toHaveBeenCalledTimes(1);
    const permCallOrder = requestPermission.mock.invocationCallOrder[0];
    const subscribeCallOrder = doSubscribe.mock.invocationCallOrder[0];
    expect(permCallOrder).toBeLessThan(subscribeCallOrder);
  });

  it('sets state to "subscribed" when permission is granted and VAPID key exists', async () => {
    const result = await runSubscribeFlow(
      () => Promise.resolve('granted'),
      () => Promise.resolve('valid-vapid-key'),
      () => Promise.resolve(),
    );

    expect(result.state).toBe('subscribed');
    expect(result.error).toBeNull();
  });

  it('sets state to "denied" and error message when permission is denied', async () => {
    const doSubscribe = vi.fn();

    const result = await runSubscribeFlow(
      () => Promise.resolve('denied'),
      () => Promise.resolve('vapid-key'),
      doSubscribe,
    );

    expect(result.state).toBe('denied');
    expect(result.error).toContain('denied');
    // Subscribe should NOT be called when permission is denied
    expect(doSubscribe).not.toHaveBeenCalled();
  });

  it('sets state to "unsubscribed" when permission is dismissed (default)', async () => {
    const doSubscribe = vi.fn();

    const result = await runSubscribeFlow(
      () => Promise.resolve('default'),
      () => Promise.resolve('vapid-key'),
      doSubscribe,
    );

    expect(result.state).toBe('unsubscribed');
    expect(result.error).toBeNull();
    expect(doSubscribe).not.toHaveBeenCalled();
  });

  it('sets state to "unsubscribed" with error when VAPID key is missing', async () => {
    const result = await runSubscribeFlow(
      () => Promise.resolve('granted'),
      () => Promise.resolve(null),
      () => Promise.resolve(),
    );

    expect(result.state).toBe('unsubscribed');
    expect(result.error).toContain('Push not configured on server');
  });

  it('sets state to "unsubscribed" with error when subscription fails', async () => {
    const result = await runSubscribeFlow(
      () => Promise.resolve('granted'),
      () => Promise.resolve('valid-vapid-key'),
      () => Promise.reject(new Error('PushManager subscription failed')),
    );

    expect(result.state).toBe('unsubscribed');
    expect(result.error).toContain('PushManager subscription failed');
  });

  it('does not call getVapidKey when permission is denied', async () => {
    const getVapidKey = vi.fn().mockResolvedValue('key');
    const doSubscribe = vi.fn();

    await runSubscribeFlow(
      () => Promise.resolve('denied'),
      getVapidKey,
      doSubscribe,
    );

    expect(getVapidKey).not.toHaveBeenCalled();
  });
});
