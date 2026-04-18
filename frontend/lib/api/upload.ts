/**
 * Uploads a file directly to Cloudflare R2 using a backend-generated pre-signed URL.
 * The browser does the actual PUT — Railway never touches R2, avoiding the TLS issue.
 *
 * Prerequisite: R2 CORS must be configured in the Cloudflare dashboard:
 *   Bucket → Settings → CORS Policy
 *   AllowedOrigins: ["*"], AllowedMethods: ["PUT"], AllowedHeaders: ["*"], MaxAgeSeconds: 3600
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

  const token = typeof window !== 'undefined' ? localStorage.getItem('buddi_access_token') : null;
  if (!token) throw new Error('Not authenticated');

  // Step 1: Get a pre-signed PUT URL from the backend.
  // This is just signing math — no backend→R2 HTTP request.
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
