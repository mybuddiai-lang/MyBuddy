/**
 * uploadToR2 — upload a file directly from the browser to Cloudflare R2.
 *
 * Flow: Browser → GET /api/backend/files/upload-url (Railway signs URL, pure crypto)
 *       Browser → PUT {presignedUrl} (direct to R2, no Node.js TLS involved)
 *
 * Node.js (Railway / Vercel Lambda) cannot connect to r2.cloudflarestorage.com due to
 * an OpenSSL / EC-certificate TLS incompatibility. Browsers (BoringSSL/NSS) have no
 * such issue and can PUT directly to R2 using the pre-signed URL.
 *
 * Requirements:
 *   - R2 CORS: Cloudflare Dashboard → R2 → buddi-bucket → Settings → CORS
 *     AllowedOrigins: ["*"]  AllowedMethods: ["PUT","GET","HEAD"]  AllowedHeaders: ["*"]
 *   - Railway env: CLOUDFLARE_R2_PUBLIC_URL, CLOUDFLARE_R2_BUCKET, CLOUDFLARE_ACCOUNT_ID,
 *     CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY
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

  // Step 1: Ask the backend to sign a PUT URL (pure crypto — no Railway→R2 connection)
  const params = new URLSearchParams({
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
  });

  const urlRes = await fetch(`/api/backend/files/upload-url?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!urlRes.ok) {
    const err = await urlRes.json().catch(() => ({}));
    throw new Error(
      (err as any)?.message ?? `Could not get upload URL (${urlRes.status})`,
    );
  }

  const json = await urlRes.json();
  // Handle both plain { uploadUrl, publicUrl, type } and NestJS-wrapped { data: {...} }
  const payload = (json.data ?? json) as {
    uploadUrl: string;
    publicUrl: string;
    type: 'IMAGE' | 'FILE' | 'VOICE';
  };
  const { uploadUrl, publicUrl, type } = payload;

  // Step 2: Browser PUTs the file directly to R2 — bypasses all Node.js TLS
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });

  if (!putRes.ok) {
    const body = await putRes.text().catch(() => '');
    throw new Error(
      `Upload to storage failed (${putRes.status})${body ? ': ' + body.slice(0, 300) : ''}`,
    );
  }

  return { url: publicUrl, type };
}

// Backward-compatible alias — slides.ts, community.ts, chat/page.tsx import this name
export { uploadToR2 as uploadViaProxy };
