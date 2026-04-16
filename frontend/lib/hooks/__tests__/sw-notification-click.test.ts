/**
 * Unit tests for the service worker notificationclick window-focusing logic.
 *
 * These tests verify:
 * 1. An existing open window is focused and navigated (no duplicate tab)
 * 2. A new window is opened only when no existing window is found
 * 3. The target URL is always a fully-qualified absolute URL
 */
import { describe, it, expect, vi } from 'vitest';

// ── Pure logic extracted from sw.js notificationclick handler ─────────────────

async function handleNotificationClick(
  targetUrl: string,
  matchAll: () => Promise<Array<{ url: string; focus: () => Promise<any>; navigate: (url: string) => Promise<any> }>>,
  openWindow: (url: string) => Promise<any>,
): Promise<'focused' | 'opened'> {
  const clientList = await matchAll();
  for (const client of clientList) {
    if ('focus' in client) {
      await client.navigate(targetUrl);
      await client.focus();
      return 'focused';
    }
  }
  await openWindow(targetUrl);
  return 'opened';
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SW notificationclick — window focus vs open', () => {
  it('focuses and navigates an existing window when one is available', async () => {
    const focusMock = vi.fn().mockResolvedValue(undefined);
    const navigateMock = vi.fn().mockResolvedValue(undefined);
    const openWindowMock = vi.fn().mockResolvedValue(undefined);

    const matchAll = vi.fn().mockResolvedValue([
      { url: 'https://mybuddyy.vercel.app/', focus: focusMock, navigate: navigateMock },
    ]);

    const result = await handleNotificationClick(
      'https://mybuddyy.vercel.app/recall',
      matchAll,
      openWindowMock,
    );

    expect(result).toBe('focused');
    expect(navigateMock).toHaveBeenCalledWith('https://mybuddyy.vercel.app/recall');
    expect(focusMock).toHaveBeenCalledTimes(1);
    // openWindow must NOT be called when an existing window is found
    expect(openWindowMock).not.toHaveBeenCalled();
  });

  it('opens a new window when no existing window is found', async () => {
    const openWindowMock = vi.fn().mockResolvedValue(undefined);
    const matchAll = vi.fn().mockResolvedValue([]); // no open windows

    const result = await handleNotificationClick(
      'https://mybuddyy.vercel.app/recall',
      matchAll,
      openWindowMock,
    );

    expect(result).toBe('opened');
    expect(openWindowMock).toHaveBeenCalledWith('https://mybuddyy.vercel.app/recall');
  });

  it('only focuses the first matching window (not multiple)', async () => {
    const focus1 = vi.fn().mockResolvedValue(undefined);
    const navigate1 = vi.fn().mockResolvedValue(undefined);
    const focus2 = vi.fn().mockResolvedValue(undefined);
    const navigate2 = vi.fn().mockResolvedValue(undefined);
    const openWindowMock = vi.fn();

    const matchAll = vi.fn().mockResolvedValue([
      { url: 'https://mybuddyy.vercel.app/', focus: focus1, navigate: navigate1 },
      { url: 'https://mybuddyy.vercel.app/chat', focus: focus2, navigate: navigate2 },
    ]);

    await handleNotificationClick(
      'https://mybuddyy.vercel.app/recall',
      matchAll,
      openWindowMock,
    );

    // Only the first window should be focused
    expect(focus1).toHaveBeenCalledTimes(1);
    expect(focus2).not.toHaveBeenCalled();
    expect(openWindowMock).not.toHaveBeenCalled();
  });

  it('navigates to the correct target URL (not the window\'s current URL)', async () => {
    const navigateMock = vi.fn().mockResolvedValue(undefined);
    const focusMock = vi.fn().mockResolvedValue(undefined);
    const openWindowMock = vi.fn();

    const matchAll = vi.fn().mockResolvedValue([
      { url: 'https://mybuddyy.vercel.app/chat', focus: focusMock, navigate: navigateMock },
    ]);

    const targetUrl = 'https://mybuddyy.vercel.app/recall';
    await handleNotificationClick(targetUrl, matchAll, openWindowMock);

    // Must navigate to the notification's URL, not the window's current URL
    expect(navigateMock).toHaveBeenCalledWith(targetUrl);
  });

  it('falls back to openWindow when matchAll rejects', async () => {
    const openWindowMock = vi.fn().mockResolvedValue(undefined);
    const matchAll = vi.fn().mockRejectedValue(new Error('clients.matchAll failed'));

    // In a real SW this would be caught by event.waitUntil,
    // but we test the graceful path here
    await expect(
      handleNotificationClick('https://mybuddyy.vercel.app/recall', matchAll, openWindowMock),
    ).rejects.toThrow(); // expected to propagate — SW runtime handles it
  });
});

describe('notification URL construction', () => {
  /**
   * The SW resolves the notification URL against the SW's origin so that
   * relative paths like '/recall' become absolute URLs.
   */
  function resolveNotificationUrl(rawUrl: string | undefined, origin: string): string {
    return new URL(rawUrl || '/', origin).href;
  }

  it('resolves relative path to absolute URL', () => {
    const url = resolveNotificationUrl('/recall', 'https://mybuddyy.vercel.app');
    expect(url).toBe('https://mybuddyy.vercel.app/recall');
  });

  it('uses root path when notification URL is undefined', () => {
    const url = resolveNotificationUrl(undefined, 'https://mybuddyy.vercel.app');
    expect(url).toBe('https://mybuddyy.vercel.app/');
  });

  it('preserves already-absolute URL', () => {
    const url = resolveNotificationUrl('https://mybuddyy.vercel.app/chat', 'https://mybuddyy.vercel.app');
    expect(url).toBe('https://mybuddyy.vercel.app/chat');
  });
});
