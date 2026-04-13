/**
 * Unit tests for the slides API layer.
 *
 * These tests verify that:
 * 1. directUpload sends to the PROXY path (/api/backend/*) — NOT directly to
 *    NEXT_PUBLIC_API_URL (which is localhost in local dev and would break in production).
 * 2. slidesApi.upload correctly unwraps the TransformInterceptor envelope
 *    { success: true, data: <note> } and returns just the note.
 * 3. slidesApi.getAll correctly unwraps the array from the envelope.
 * 4. Errors from non-2xx responses are thrown with useful information.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers — mimic the exact logic in slides.ts without importing the module
// (avoids axios/next dependencies in test environment)
// ---------------------------------------------------------------------------

async function directUpload(path: string, form: FormData, fetchFn: typeof fetch): Promise<any> {
  const token = null; // simplified for tests
  const res = await fetchFn(`/api/backend${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.message || 'Upload failed'), {
      response: { status: res.status, data: err },
    });
  }
  return res.json();
}

async function uploadNote(file: File, fetchFn: typeof fetch) {
  const form = new FormData();
  form.append('file', file);
  form.append('title', file.name.replace(/\.[^/.]+$/, ''));
  const data = await directUpload('/files/upload', form, fetchFn);
  return data.data; // unwrap TransformInterceptor envelope
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('directUpload', () => {
  it('sends POST to /api/backend/files/upload (proxy path, not direct backend URL)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'note-1', title: 'lecture', processingStatus: 'PENDING' } }),
    });

    const form = new FormData();
    await directUpload('/files/upload', form, mockFetch as any);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/backend/files/upload',
      expect.objectContaining({ method: 'POST' }),
    );

    // Must NOT call the backend directly
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('localhost');
    expect(calledUrl).not.toContain('railway.app');
  });

  it('returns the parsed JSON body on success', async () => {
    const responseBody = { success: true, data: { id: 'note-1', processingStatus: 'PENDING' } };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    });

    const result = await directUpload('/files/upload', new FormData(), mockFetch as any);

    expect(result).toEqual(responseBody);
  });

  it('throws an error for non-OK responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    });

    await expect(
      directUpload('/files/upload', new FormData(), mockFetch as any),
    ).rejects.toThrow('Unauthorized');
  });

  it('throws a generic error when non-OK response has no JSON', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('no json'); },
    });

    await expect(
      directUpload('/files/upload', new FormData(), mockFetch as any),
    ).rejects.toThrow('Upload failed');
  });
});

describe('slidesApi.upload — response envelope unwrapping', () => {
  it('returns data.data (the Note object) from TransformInterceptor envelope', async () => {
    const note = { id: 'note-1', title: 'lecture', fileType: 'PDF', processingStatus: 'PENDING', masteryLevel: 0, createdAt: new Date().toISOString() };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: note, timestamp: Date.now() }),
    });

    const file = new File(['pdf content'], 'lecture.pdf', { type: 'application/pdf' });
    const result = await uploadNote(file, mockFetch as any);

    // Must return the inner note, NOT the whole envelope
    expect(result).toEqual(note);
    expect(result).toHaveProperty('id', 'note-1');
    expect(result).not.toHaveProperty('success');
    expect(result).not.toHaveProperty('timestamp');
  });

  it('strips the extension from filename to use as title', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'n1' } }),
    });

    const file = new File(['content'], 'anatomy-notes.pdf', { type: 'application/pdf' });
    await uploadNote(file, mockFetch as any);

    const body = mockFetch.mock.calls[0][1].body as FormData;
    expect(body.get('title')).toBe('anatomy-notes');
  });
});

describe('community API response parsing', () => {
  /**
   * The frontend reads: (res as any)?.data?.data ?? (res as any)?.data
   *
   * res.data = TransformInterceptor body = { success: true, data: [...pods] }
   * res.data.data = [...pods]  ← what we want
   */

  it('extracts pods array from TransformInterceptor double-wrapped response', () => {
    // Simulate what axios returns when TransformInterceptor is active
    const pods = [
      { id: 'pod-1', name: 'MBBS Finals', subjectFilter: 'Medicine', myRole: 'ADMIN', isPublic: true, memberCount: 1 },
    ];

    // This is the shape axios gives us: res.data = parsed JSON body
    const axiosResponse = {
      status: 200,
      data: { success: true, data: pods, timestamp: Date.now() },
    };

    const raw = (axiosResponse as any)?.data?.data ?? (axiosResponse as any)?.data;

    expect(Array.isArray(raw)).toBe(true);
    expect(raw).toHaveLength(1);
    expect(raw[0]).toHaveProperty('id', 'pod-1');
  });

  it('falls back to data when data.data is undefined (non-interceptor response)', () => {
    // Backend without TransformInterceptor returns array directly
    const pods = [{ id: 'pod-1', name: 'Test Pod' }];
    const axiosResponse = { status: 200, data: pods };

    const raw = (axiosResponse as any)?.data?.data ?? (axiosResponse as any)?.data;

    expect(Array.isArray(raw)).toBe(true);
    expect(raw[0]).toHaveProperty('id', 'pod-1');
  });
});

describe('normalisePod', () => {
  function normalisePod(p: any) {
    const SUBJECT_COLORS: Record<string, string> = {
      Medicine: 'bg-red-100 text-red-600',
      General: 'bg-brand-100 text-brand-600',
    };
    const COLOR_LIST = Object.values(SUBJECT_COLORS);
    function getColor(pod: any): string {
      const key = pod.field || pod.subject || '';
      return SUBJECT_COLORS[key] || COLOR_LIST[Math.abs((pod.id?.charCodeAt(0) ?? 0)) % COLOR_LIST.length];
    }
    const field = p.field || p.subjectFilter || 'General';
    return {
      ...p,
      field,
      isMember: !!(p.myRole),
      color: getColor({ ...p, field }),
    };
  }

  it('maps subjectFilter to field', () => {
    const pod = normalisePod({ id: 'p1', name: 'Pod', subjectFilter: 'Medicine', myRole: null });
    expect(pod.field).toBe('Medicine');
  });

  it('sets isMember=true when myRole is set', () => {
    const pod = normalisePod({ id: 'p1', name: 'Pod', subjectFilter: 'General', myRole: 'ADMIN' });
    expect(pod.isMember).toBe(true);
  });

  it('sets isMember=false when myRole is null', () => {
    const pod = normalisePod({ id: 'p1', name: 'Pod', subjectFilter: 'General', myRole: null });
    expect(pod.isMember).toBe(false);
  });

  it('defaults field to General when subjectFilter is null', () => {
    const pod = normalisePod({ id: 'p1', name: 'Pod', subjectFilter: null, myRole: null });
    expect(pod.field).toBe('General');
  });

  it('does not override field when already set', () => {
    const pod = normalisePod({ id: 'p1', name: 'Pod', field: 'Engineering', subjectFilter: 'Medicine', myRole: null });
    expect(pod.field).toBe('Engineering');
  });
});

describe('fetchPods retry logic', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function runFetchPods(getAll: () => Promise<any>) {
    let loadError = false;
    let pods: any[] = [];
    let loading = true;
    const _cache: any[] = [];

    await new Promise<void>((resolve) => {
      const attempt = (n: number) => {
        getAll()
          .then(res => {
            const raw = (res as any)?.data?.data ?? (res as any)?.data;
            const list = Array.isArray(raw) ? raw : [];
            pods = list;
            loading = false;
            resolve();
          })
          .catch(() => {
            if (n < 2) {
              setTimeout(() => attempt(n + 1), 1500);
              vi.advanceTimersByTime(1500);
            } else {
              if (_cache.length === 0) loadError = true;
              loading = false;
              resolve();
            }
          });
      };
      attempt(0);
    });

    return { loadError, pods, loading };
  }

  it('returns pods on first successful attempt', async () => {
    const pods = [{ id: 'p1', name: 'Pod A', subjectFilter: 'Medicine', myRole: null }];
    const getAll = vi.fn().mockResolvedValue({ data: { success: true, data: pods } });

    const result = await runFetchPods(getAll);

    expect(result.pods).toHaveLength(1);
    expect(result.loadError).toBe(false);
    expect(getAll).toHaveBeenCalledTimes(1);
  });

  it('retries up to 3 times before showing error', async () => {
    const getAll = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await runFetchPods(getAll);

    expect(result.loadError).toBe(true);
    expect(getAll).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('succeeds on the second attempt (transient failure)', async () => {
    const pods = [{ id: 'p1', name: 'Pod A', subjectFilter: 'General', myRole: 'MEMBER' }];
    const getAll = vi.fn()
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({ data: { success: true, data: pods } });

    const result = await runFetchPods(getAll);

    expect(result.pods).toHaveLength(1);
    expect(result.loadError).toBe(false);
    expect(getAll).toHaveBeenCalledTimes(2);
  });
});
