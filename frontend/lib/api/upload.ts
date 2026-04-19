/**
 * uploadToR2 — upload a file directly from the browser to Cloudflare R2.
 *
 * Flow:
 *   1. Browser → GET /api/backend/files/upload-url (Node.js proxy → Railway signs URL, pure crypto)
 *   2. Browser → PUT {presignedUrl} directly to R2
 *
 * Why browser-direct:
 *   Railway (Node.js/OpenSSL) cannot TLS-handshake with r2.cloudflarestorage.com due to an
 *   EC-certificate incompatibility (SSL alert 40). The browser has no such restriction.
 *   R2 CORS must be configured: AllowedOrigins:["*"] AllowedMethods:["PUT"] AllowedHeaders:["*"]
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

  const contentType = file.type || 'application/octet-stream';

  // ── Step 1: Get a pre-signed PUT URL from the backend ─────────────────────
  // The backend calls Railway which signs the URL with AWS SDK — no R2 network traffic.
  const params = new URLSearchParams({ filename: file.name, contentType });
  const urlRes = await fetch(`/api/backend/files/upload-url?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!urlRes.ok) {
    const err = await urlRes.json().catch(() => ({}));
    throw new Error(
      (err as any)?.message ?? (err as any)?.error ?? `Could not get upload URL (${urlRes.status})`,
    );
  }

  const json = await urlRes.json();
  // NestJS TransformInterceptor wraps all responses: { success, data: {...}, timestamp }
  const payload = (json.data ?? json) as { uploadUrl: string; publicUrl: string; type: string };
  const { uploadUrl, publicUrl, type } = payload;

  if (!uploadUrl || !publicUrl) {
    throw new Error('Backend returned an invalid upload URL — check Railway env vars');
  }

  // ── Step 2: PUT the file directly to R2 from the browser ──────────────────
  // The pre-signed URL encodes all auth. R2 CORS allows PUT from any origin.
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!putRes.ok) {
    const errText = await putRes.text().catch(() => '');
    throw new Error(
      `R2 upload failed (${putRes.status})${errText ? ': ' + errText.slice(0, 300) : ''}`,
    );
  }

  const fileType = (['IMAGE', 'VOICE', 'FILE'].includes(type) ? type : 'FILE') as
    | 'IMAGE'
    | 'FILE'
    | 'VOICE';
  return { url: publicUrl, type: fileType };
}

// Backward-compatible alias — slides.ts, community.ts, chat/page.tsx import this name
export { uploadToR2 as uploadViaProxy };
