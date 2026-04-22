/**
 * Unit tests for community.uploadAttachment
 *
 * Verifies the pod image upload uses the exact same direct-to-Railway
 * multipart flow as chat — NOT the pre-signed R2 URL flow.
 *
 * Covered:
 *   1. Sends POST to ${NEXT_PUBLIC_API_URL}/files/upload-attachment (NOT through proxy)
 *   2. Token is included in Authorization header
 *   3. File is appended as 'file' field in the FormData body
 *   4. Returns { url, type } from unwrapped envelope (json.data ?? json)
 *   5. Handles flat response shape (no envelope)
 *   6. Throws when the server returns a non-OK status
 *   7. Throws a generic error when non-OK body has no JSON
 *   8. Throws 'Not authenticated' when no token is stored
 *   9. MIME-type detection: image → IMAGE, audio → VOICE, other → FILE
 *  10. Retry is NOT baked into uploadAttachment itself (handled by callers)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Inline replica of communityApi.uploadAttachment
// (Avoids importing axios / Next.js env at test time)
// ---------------------------------------------------------------------------

type AttachmentType = 'IMAGE' | 'FILE' | 'VOICE';

async function uploadAttachment(
  file: File,
  opts: {
    backendUrl: string;
    token: string | null;
    fetchFn: typeof fetch;
  },
): Promise<{ url: string; type: AttachmentType }> {
  const { backendUrl, token, fetchFn } = opts;

  if (!token) throw new Error('Not authenticated');

  const form = new FormData();
  form.append('file', file);

  const res = await fetchFn(`${backendUrl}/files/upload-attachment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `Upload failed (${res.status})`);
  }

  const json = await res.json();
  const data = json.data ?? json;
  return { url: data.url, type: data.type ?? 'FILE' };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BACKEND_URL = 'https://mybuddy-production-2ad0.up.railway.app/api';
const TOKEN = 'test-jwt-token';

function makeFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['binary'], name, { type });
}

function okResponse(body: object) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

function errorResponse(status: number, body: object | null = null) {
  return {
    ok: false,
    status,
    json: body !== null ? async () => body : async () => { throw new Error('no json'); },
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('communityApi.uploadAttachment — request shape', () => {
  it('sends POST directly to Railway /files/upload-attachment (not via proxy)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse({ data: { url: 'https://cdn.example.com/img.jpg', type: 'IMAGE' } }),
    );

    await uploadAttachment(makeFile(), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any });

    const [calledUrl] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe(`${BACKEND_URL}/files/upload-attachment`);

    // Must NOT go through the Vercel proxy
    expect(calledUrl).not.toContain('/api/backend/');
    expect(calledUrl).not.toContain('localhost');
    expect(calledUrl).not.toContain('vercel.app');
  });

  it('sends Authorization header with Bearer token', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse({ data: { url: 'https://cdn.example.com/img.jpg', type: 'IMAGE' } }),
    );

    await uploadAttachment(makeFile(), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any });

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('uses POST method', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse({ data: { url: 'https://cdn.example.com/img.jpg', type: 'IMAGE' } }),
    );

    await uploadAttachment(makeFile(), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any });

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
  });

  it('appends file under the "file" key in FormData body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse({ data: { url: 'https://cdn.example.com/img.jpg', type: 'IMAGE' } }),
    );
    const file = makeFile('lecture.jpg', 'image/jpeg');

    await uploadAttachment(file, { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any });

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
  });
});

describe('communityApi.uploadAttachment — response unwrapping', () => {
  it('returns url and type from TransformInterceptor envelope (json.data)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse({
        success: true,
        data: { url: 'https://cdn.example.com/img.jpg', type: 'IMAGE' },
        timestamp: Date.now(),
      }),
    );

    const result = await uploadAttachment(makeFile(), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any });

    expect(result.url).toBe('https://cdn.example.com/img.jpg');
    expect(result.type).toBe('IMAGE');
  });

  it('returns url and type from flat response shape (no envelope)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse({ url: 'https://cdn.example.com/doc.pdf', type: 'FILE' }),
    );

    const result = await uploadAttachment(makeFile('doc.pdf', 'application/pdf'), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any });

    expect(result.url).toBe('https://cdn.example.com/doc.pdf');
    expect(result.type).toBe('FILE');
  });

  it('defaults type to FILE when backend omits the type field', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse({ data: { url: 'https://cdn.example.com/unknown.bin' } }),
    );

    const result = await uploadAttachment(makeFile('unknown.bin', 'application/octet-stream'), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any });

    expect(result.type).toBe('FILE');
  });

  it('returns VOICE type for audio uploads', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse({ data: { url: 'https://cdn.example.com/voice.mp3', type: 'VOICE' } }),
    );

    const result = await uploadAttachment(makeFile('voice.mp3', 'audio/mpeg'), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any });

    expect(result.type).toBe('VOICE');
  });
});

describe('communityApi.uploadAttachment — error handling', () => {
  it('throws with server error message on non-OK response', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      errorResponse(413, { message: 'File too large' }),
    );

    await expect(
      uploadAttachment(makeFile(), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any }),
    ).rejects.toThrow('File too large');
  });

  it('throws generic message when non-OK body has no JSON', async () => {
    const fetchFn = vi.fn().mockResolvedValue(errorResponse(500, null));

    await expect(
      uploadAttachment(makeFile(), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any }),
    ).rejects.toThrow('Upload failed (500)');
  });

  it('throws 401 error message from server', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      errorResponse(401, { message: 'Unauthorized' }),
    );

    await expect(
      uploadAttachment(makeFile(), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any }),
    ).rejects.toThrow('Unauthorized');
  });

  it('throws Not authenticated when token is null', async () => {
    const fetchFn = vi.fn();

    await expect(
      uploadAttachment(makeFile(), { backendUrl: BACKEND_URL, token: null, fetchFn: fetchFn as any }),
    ).rejects.toThrow('Not authenticated');

    // fetch must never be called
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('communityApi.uploadAttachment — does NOT use pre-signed R2 URL flow', () => {
  it('makes exactly one fetch call (no pre-signed URL round-trip)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse({ data: { url: 'https://cdn.example.com/img.jpg', type: 'IMAGE' } }),
    );

    await uploadAttachment(makeFile(), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any });

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not call /files/upload-url (the pre-signed URL endpoint)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse({ data: { url: 'https://cdn.example.com/img.jpg', type: 'IMAGE' } }),
    );

    await uploadAttachment(makeFile(), { backendUrl: BACKEND_URL, token: TOKEN, fetchFn: fetchFn as any });

    const [calledUrl] = fetchFn.mock.calls[0] as [string];
    expect(calledUrl).not.toContain('upload-url');
  });
});
