import { NextRequest, NextResponse } from 'next/server';

// Run in Node.js runtime so fetch uses Node's TLS stack (not Edge's).
// Vercel's Lambda environment (Amazon Linux + modern OpenSSL) can reach
// r2.cloudflarestorage.com — Railway's Alpine OpenSSL cannot.
export const runtime = 'nodejs';
export const maxDuration = 60;

const BACKEND =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api';

export async function POST(req: NextRequest) {
  // Forward the browser's auth token to Railway
  const auth = req.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse the multipart body
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request — expected multipart/form-data' },
      { status: 400 },
    );
  }

  const fileEntry = formData.get('file');
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  const file = fileEntry;

  // ── Step 1: get a pre-signed PUT URL from Railway ─────────────────────────
  // Railway generates the URL via pure cryptographic signing — no Railway→R2
  // network call happens here, so the TLS incompatibility is not involved.
  const qs = new URLSearchParams({
    contentType: file.type || 'application/octet-stream',
    filename: file.name,
  });

  let uploadUrl: string;
  let publicUrl: string;
  let type: string;

  try {
    const r = await fetch(`${BACKEND}/files/upload-url?${qs}`, {
      headers: { Authorization: auth },
      cache: 'no-store',
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      return NextResponse.json(
        { error: (e as any)?.message ?? 'Could not get upload URL from backend' },
        { status: r.status },
      );
    }
    const j = await r.json();
    const d = j.data ?? j;
    uploadUrl = d.uploadUrl;
    publicUrl = d.publicUrl;
    type = d.type ?? 'FILE';
    if (!uploadUrl || !publicUrl) {
      throw new Error('Backend returned an incomplete upload URL response');
    }
  } catch (err: any) {
    console.error('[/api/upload] backend error:', err?.message);
    return NextResponse.json(
      { error: err?.message ?? 'Backend unavailable' },
      { status: 502 },
    );
  }

  // ── Step 2: PUT the file to R2 from Vercel's servers ─────────────────────
  // The browser never talks to R2 directly — no CORS headers required.
  // The pre-signed URL already contains auth; no extra credentials needed here.
  try {
    const buf = await file.arrayBuffer();
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: buf,
    });

    if (!put.ok) {
      const text = await put.text().catch(() => '');
      console.error(`[/api/upload] R2 PUT failed ${put.status}:`, text.slice(0, 300));
      return NextResponse.json(
        { error: `File storage failed (${put.status}). Please try again.` },
        { status: 502 },
      );
    }
  } catch (err: any) {
    console.error('[/api/upload] R2 PUT error:', err?.message);
    return NextResponse.json(
      { error: 'File storage unavailable. Please try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: publicUrl, type });
}
