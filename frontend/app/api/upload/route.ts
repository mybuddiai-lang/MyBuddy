import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge Runtime upload proxy — Browser → Vercel Edge → R2
 *
 * Why Edge Runtime (not Node.js):
 *   Node.js OpenSSL fails to complete the TLS handshake with r2.cloudflarestorage.com
 *   (SSL alert 40 — EC certificate incompatibility). Both Railway Lambda and Vercel
 *   Node.js Lambda exhibit this. Vercel Edge Runtime uses V8's built-in fetch
 *   (BoringSSL-family), which handles R2's EC cert correctly.
 *
 * Why server-side proxy (not browser-direct):
 *   Browser-direct PUTs require CORS to be configured on the R2 bucket.
 *   Routing through Edge eliminates CORS entirely (server-to-server).
 *
 * Request format (from browser):
 *   POST /api/upload
 *   Authorization: Bearer <token>
 *   Content-Type: <file MIME type>
 *   X-Filename: <original filename>
 *   body: raw file bytes
 */

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const filename = req.headers.get('x-filename');
  if (!filename) return NextResponse.json({ error: 'Missing X-Filename header' }, { status: 400 });

  const contentType = req.headers.get('content-type') || 'application/octet-stream';

  const backendUrl = process.env.BACKEND_API_URL;
  if (!backendUrl) {
    return NextResponse.json({ error: 'Server misconfiguration: BACKEND_API_URL not set' }, { status: 500 });
  }

  // Step 1: Get pre-signed PUT URL from Railway (pure crypto — no Railway→R2 network call)
  const params = new URLSearchParams({ filename, contentType });
  let urlRes: Response;
  try {
    urlRes = await fetch(`${backendUrl}/files/upload-url?${params}`, {
      headers: { Authorization: auth },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Cannot reach backend: ${err?.message ?? 'network error'}` },
      { status: 502 },
    );
  }

  if (!urlRes.ok) {
    const err = await urlRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as any)?.message ?? `Could not get upload URL (${urlRes.status})` },
      { status: urlRes.status },
    );
  }

  const json = await urlRes.json();
  // Handle both plain { uploadUrl, publicUrl, type } and NestJS-wrapped { data: {...} }
  const payload = (json.data ?? json) as { uploadUrl: string; publicUrl: string; type: string };
  const { uploadUrl, publicUrl, type } = payload;

  if (!uploadUrl || !publicUrl) {
    return NextResponse.json({ error: 'Invalid upload URL from backend' }, { status: 502 });
  }

  // Step 2: Buffer the file body (needed so we can set Content-Length for R2's PUT)
  let bodyBuffer: ArrayBuffer;
  try {
    bodyBuffer = await req.arrayBuffer();
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to read request body: ${err?.message ?? 'unknown'}` },
      { status: 400 },
    );
  }

  // Step 3: PUT directly to R2 — Edge Runtime uses V8 fetch, not Node.js OpenSSL
  let putRes: Response;
  try {
    putRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: bodyBuffer,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bodyBuffer.byteLength),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to reach R2 storage: ${err?.message ?? 'network error'}` },
      { status: 502 },
    );
  }

  if (!putRes.ok) {
    const body = await putRes.text().catch(() => '');
    return NextResponse.json(
      { error: `Storage PUT failed (${putRes.status})${body ? ': ' + body.slice(0, 300) : ''}` },
      { status: 502 },
    );
  }

  const fileType = type ?? (
    contentType.startsWith('image/') ? 'IMAGE'
    : contentType.startsWith('audio/') ? 'VOICE'
    : 'FILE'
  );

  return NextResponse.json({ url: publicUrl, type: fileType });
}
