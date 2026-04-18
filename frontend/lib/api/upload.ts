/**
 * uploadViaProxy — upload a file through the Vercel server-side route.
 *
 * Flow: Browser → POST /api/upload → Vercel Node.js → PUT to R2
 *
 * Why: The browser cannot PUT directly to r2.cloudflarestorage.com without
 * CORS configured on the bucket. Routing through Vercel's Lambda (Amazon
 * Linux + modern OpenSSL) avoids CORS entirely — no Cloudflare dashboard
 * config required.
 *
 * Use this for community post attachments and chat file attachments.
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
  if (!data.url) throw new Error('Invalid response from upload server');

  return {
    url: data.url as string,
    type: (data.type ?? 'FILE') as 'IMAGE' | 'FILE' | 'VOICE',
  };
}

/**
 * uploadToR2 — browser-direct PUT to Cloudflare R2 via a backend-generated
 * pre-signed URL.
 *
 * Use this ONLY for slide/note uploads (up to 50 MB) where the Vercel proxy
 * body-size limit would be exceeded.
 *
 * REQUIRES R2 CORS to be configured in the Cloudflare dashboard:
 *   Bucket → Settings → CORS Policy
 *   AllowedOrigins: ["*"]  AllowedMethods: ["PUT"]  AllowedHeaders: ["*"]
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

  // Step 1: Get a pre-signed PUT URL from the backend.
  // Pure cryptographic signing — no backend→R2 network call.
  const params = new URLSearchParams({
    contentType: file.type || 'application/octet-stream',
    filename: file.name,
  });
  const urlRes = await fetch(`/api/backend/files/upload-url?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!urlRes.ok) {
    const err = await urlRes.json().catch(() => ({}));
    throw new Error((err as any)?.message ?? `Could not get upload URL (${urlRes.status})`);
  }
  const urlJson = await urlRes.json();
  const { uploadUrl, publicUrl, type } = urlJson.data ?? urlJson;
  if (!uploadUrl || !publicUrl) throw new Error('Invalid upload URL response from server');

  // Step 2: PUT the file directly from the browser to R2.
  // Requires R2 CORS to be configured (AllowedMethods: PUT).
  const putRes = await fetch(uploadUrl as string, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(
      putRes.status === 0 || putRes.type === 'opaque'
        ? 'Upload blocked by CORS. Configure R2 CORS in Cloudflare dashboard (AllowedMethods: PUT).'
        : `Upload to storage failed (${putRes.status}).`,
    );
  }

  return { url: publicUrl as string, type: type as 'IMAGE' | 'FILE' | 'VOICE' };
}
