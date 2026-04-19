import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge Runtime upload proxy — Browser → Vercel Edge → R2
 *
 * Why Edge Runtime:
 *   Node.js OpenSSL (Railway + Vercel Lambda) cannot TLS-handshake with
 *   r2.cloudflarestorage.com (SSL alert 40, EC certificate). Vercel Edge Runtime
 *   uses V8's built-in fetch (BoringSSL-family) which handles R2's EC cert correctly.
 *   Routing through Edge also eliminates browser CORS entirely (server-to-server PUT).
 *
 * IMPORTANT — Content-Length must NOT be set manually in fetch() headers.
 *   It is a forbidden request header in the Web Fetch API spec. Setting it throws
 *   a TypeError in Edge Runtime, crashing the function. The Fetch API sets it
 *   automatically from the ArrayBuffer body.
 */

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const filename = req.headers.get('x-filename');
    if (!filename) return NextResponse.json({ error: 'Missing X-Filename header' }, { status: 400 });

    // Strip charset/boundary qualifiers — only the base MIME type is needed for signing
    const contentType = (req.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();

    // NEXT_PUBLIC_API_URL is always bundled by Next.js; BACKEND_API_URL may not be in Edge bundle
    const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      return NextResponse.json({ error: 'BACKEND_API_URL not configured' }, { status: 500 });
    }

    // Step 1: Get pre-signed PUT URL from Railway (pure crypto — no Railway→R2 network call)
    const params = new URLSearchParams({ filename, contentType });
    let urlRes: Response;
    try {
      urlRes = await fetch(`${backendUrl}/files/upload-url?${params}`, {
        headers: { Authorization: auth, 'Cache-Control': 'no-store' },
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
        { error: (err as any)?.message ?? `Backend error (${urlRes.status})` },
        { status: urlRes.status },
      );
    }

    const json = await urlRes.json();
    // NestJS TransformInterceptor wraps response: { success, data: { uploadUrl, publicUrl, type }, timestamp }
    const payload = (json.data ?? json) as { uploadUrl: string; publicUrl: string; type: string };
    const { uploadUrl, publicUrl, type } = payload;

    if (!uploadUrl || !publicUrl) {
      return NextResponse.json({ error: 'Backend returned invalid upload URL' }, { status: 502 });
    }

    // Step 2: Buffer the request body
    let bodyBuffer: ArrayBuffer;
    try {
      bodyBuffer = await req.arrayBuffer();
    } catch (err: any) {
      return NextResponse.json(
        { error: `Failed to read request body: ${err?.message ?? 'unknown'}` },
        { status: 400 },
      );
    }

    if (bodyBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    // Step 3: PUT directly to R2 via V8 fetch (bypasses Node.js OpenSSL entirely)
    // DO NOT set Content-Length — it is a forbidden header in the Web Fetch API.
    // The runtime sets it automatically from the ArrayBuffer body.
    let putRes: Response;
    try {
      putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: bodyBuffer,
        headers: { 'Content-Type': contentType },
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: `R2 PUT failed: ${err?.message ?? 'network error'}` },
        { status: 502 },
      );
    }

    if (!putRes.ok) {
      const body = await putRes.text().catch(() => '');
      return NextResponse.json(
        { error: `R2 storage returned ${putRes.status}${body ? ': ' + body.slice(0, 300) : ''}` },
        { status: 502 },
      );
    }

    const fileType =
      type ??
      (contentType.startsWith('image/')
        ? 'IMAGE'
        : contentType.startsWith('audio/')
          ? 'VOICE'
          : 'FILE');

    return NextResponse.json({ url: publicUrl, type: fileType });
  } catch (err: any) {
    // Top-level catch — prevents unhandled rejections from producing a raw Vercel 502
    return NextResponse.json(
      { error: `Unexpected error: ${err?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }
}
