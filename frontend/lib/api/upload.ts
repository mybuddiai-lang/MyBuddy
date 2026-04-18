/**
 * uploadToR2 — upload a file through the Vercel Edge Runtime proxy to Cloudflare R2.
 *
 * Flow: Browser → POST /api/upload (Vercel Edge, V8 fetch)
 *              → GET /backend/files/upload-url (Railway signs URL, pure crypto)
 *              → PUT {presignedUrl} (Edge → R2, V8 fetch bypasses Node.js OpenSSL TLS issue)
 *
 * The Edge Runtime uses V8's built-in fetch (not Node.js OpenSSL), so it can connect
 * to r2.cloudflarestorage.com even though Node.js Lambda cannot (EC certificate TLS issue).
 * Routing through the Edge proxy also eliminates browser CORS entirely.
 */
export async function uploadToR2(
  file: File,
  options?: { maxBytes?: number },
): Promise<{ url: string; type: 'IMAGE' | 'FILE' | 'VOICE' }> {
  const maxBytes = options?.maxBytes ?? 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    const mb = (maxBytes / 1024 / 1024).toFixed(0);
    throw new Error(`File is too large. Maximum size is ${mb} MB.`);
  }

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
  if (!token) throw new Error('Not authenticated');

  // Send raw binary to the Edge Route — not multipart, so Edge can forward it directly to R2
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': file.name,
    },
    body: file,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `Upload failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.url) throw new Error('Upload failed: no URL returned');

  return { url: data.url as string, type: (data.type ?? 'FILE') as 'IMAGE' | 'FILE' | 'VOICE' };
}

// Backward-compatible alias — slides.ts, community.ts, chat/page.tsx import this name
export { uploadToR2 as uploadViaProxy };
