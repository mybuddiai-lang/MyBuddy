/**
 * uploadViaProxy — upload a file through the Vercel server-side route.
 *
 * Flow: Browser → POST /api/upload (Vercel Node.js) → Vercel Blob storage
 *
 * Used for all file uploads: slides, community posts, chat attachments.
 */
export async function uploadViaProxy(
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

  const body = new FormData();
  body.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `Upload failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.url) throw new Error('Upload failed: no URL returned');
  return { url: data.url as string, type: (data.type ?? 'FILE') as 'IMAGE' | 'FILE' | 'VOICE' };
}
