import { NextRequest, NextResponse } from 'next/server';

// Prefer the private BACKEND_API_URL (runtime-only); fall back to the public
// NEXT_PUBLIC_API_URL that most Railway setups already have configured.
const BACKEND =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api';

// Strip these from the forwarded request — origin/referer cause CORS rejection on the backend
// since this is a server-to-server call (no browser origin needed)
const SKIP_HEADERS = new Set(['host', 'connection', 'transfer-encoding', 'keep-alive', 'origin', 'referer']);

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetUrl = `${BACKEND}/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!SKIP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  try {
    // Stream the request body directly — do NOT buffer with arrayBuffer().
    // Buffering breaks multipart/form-data: the content-type boundary is
    // preserved in the raw stream but can be mangled when re-encoded.
    // duplex:'half' is required by Node 18+ fetch when sending a ReadableStream body.
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? (req.body as ReadableStream) : undefined,
      ...(hasBody ? { duplex: 'half' } : {}),
      redirect: 'manual', // forward redirects to browser (required for Google OAuth)
    } as RequestInit);

    // Forward 3xx redirects directly to the browser
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) return NextResponse.redirect(location, { status: response.status });
    }

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!SKIP_HEADERS.has(key.toLowerCase())) responseHeaders.set(key, value);
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[proxy] Backend unreachable at ${targetUrl}:`, err);
    return NextResponse.json(
      { success: false, message: 'Backend service unavailable' },
      { status: 503 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
