import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge Runtime upload proxy — Browser → Vercel Edge → R2
 *
 * Why Edge Runtime:
 *   Node.js (Railway + Vercel Lambda) cannot TLS-handshake with r2.cloudflarestorage.com
 *   (OpenSSL / EC-certificate incompatibility, SSL alert 40). Vercel Edge Runtime uses
 *   V8 built-in fetch (BoringSSL-family) which handles R2's EC cert correctly.
 *   Routing through Edge also eliminates browser CORS for the actual file PUT.
 *
 * Why same-host routing for the presign step:
 *   Calling Railway directly from Edge Runtime can time-out (Edge nodes may not have
 *   a direct route to Railway). Instead we call the existing Node.js backend proxy on
 *   the same Vercel deployment — this path is always available.
 */

export const runtime = 'edge';

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  return { signal: ac.signal, clear: () => clearTimeout(timer) };
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const filename = req.headers.get('x-filename');
    if (!filename) return NextResponse.json({ error: 'Missing X-Filename header' }, { status: 400 });

    // Strip charset/boundary qualifiers — only the base MIME type is needed
    const contentType = (req.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();

    // Derive the base URL for internal same-host routing to the Node.js backend proxy
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    const baseUrl = `${proto}://${host}`;

    // ── Step 1: Get pre-signed PUT URL via the internal backend proxy ──────────
    // Calls /api/backend/files/upload-url (Node.js proxy) → Railway → pure crypto signing
    // Same-host routing avoids the Railway-unreachable-from-Edge-node timeout issue.
    const params = new URLSearchParams({ filename, contentType });
    const t1 = withTimeout(12_000); // 12-second cap
    let urlRes: Response;
    try {
      urlRes = await fetch(`${baseUrl}/api/backend/files/upload-url?${params}`, {
        headers: { Authorization: auth },
        signal: t1.signal,
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: `Could not reach upload service: ${err?.message ?? 'timeout'}` },
        { status: 502 },
      );
    } finally {
      t1.clear();
    }

    if (!urlRes.ok) {
      const errBody = await urlRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: (errBody as any)?.message ?? `Backend error (${urlRes.status})` },
        { status: urlRes.status },
      );
    }

    const json = await urlRes.json();
    // NestJS TransformInterceptor wraps all responses: { success, data: {...}, timestamp }
    const payload = (json.data ?? json) as { uploadUrl: string; publicUrl: string; type: string };
    const { uploadUrl, publicUrl, type } = payload;

    if (!uploadUrl || !publicUrl) {
      return NextResponse.json({ error: 'Backend returned invalid upload URL' }, { status: 502 });
    }

    // ── Step 2: Buffer the request body ───────────────────────────────────────
    let bodyBuffer: ArrayBuffer;
    try {
      bodyBuffer = await req.arrayBuffer();
    } catch (err: any) {
      return NextResponse.json(
        { error: `Failed to read file body: ${err?.message ?? 'unknown'}` },
        { status: 400 },
      );
    }

    if (bodyBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Empty file body' }, { status: 400 });
    }

    // ── Step 3: PUT directly to R2 via V8 fetch ───────────────────────────────
    // Edge Runtime uses V8 built-in fetch (not Node.js OpenSSL), so R2's EC
    // certificate is handled correctly.
    // DO NOT set Content-Length — it is a forbidden Fetch API header; the runtime
    // sets it automatically from the ArrayBuffer body length.
    const t2 = withTimeout(20_000); // 20-second cap for the actual upload
    let putRes: Response;
    try {
      putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: bodyBuffer,
        headers: { 'Content-Type': contentType },
        signal: t2.signal,
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: `R2 upload failed: ${err?.message ?? 'timeout or network error'}` },
        { status: 502 },
      );
    } finally {
      t2.clear();
    }

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => '');
      return NextResponse.json(
        { error: `R2 rejected the upload (${putRes.status})${errText ? ': ' + errText.slice(0, 300) : ''}` },
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
    return NextResponse.json(
      { error: `Unexpected error: ${err?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }
}
