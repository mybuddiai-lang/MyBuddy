import { NextRequest, NextResponse } from 'next/server';

// Prefer the private BACKEND_API_URL (runtime-only); fall back to the public
// NEXT_PUBLIC_API_URL that most Railway setups already have configured.
const BACKEND =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api';

// Headers stripped from the forwarded request:
// - origin/referer: cause CORS rejection on server-to-server calls
// - accept-encoding: we request uncompressed data (identity) so the CDN/backend
//   does not return brotli/gzip bytes that Vercel's Edge Network mishandles
const SKIP_REQUEST_HEADERS = new Set([
  'host', 'connection', 'transfer-encoding', 'keep-alive',
  'origin', 'referer', 'accept-encoding',
]);

// Headers stripped from the backend response before forwarding to the browser:
// - content-encoding: we requested identity, so no encoding to declare
// - transfer-encoding: managed by Next.js
// - cache-control / etag / vary: we set our own no-store policy below so
//   Vercel's Edge and Railway's Fastly CDN cannot cache auth/API responses
const SKIP_RESPONSE_HEADERS = new Set([
  'host', 'connection', 'transfer-encoding', 'keep-alive',
  'content-encoding', 'cache-control', 'etag', 'vary',
]);

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetUrl = `${BACKEND}/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  // Tell the backend (and Railway's Fastly CDN) not to compress the response.
  // This avoids brotli/gzip encoding mismatches that cause empty response bodies.
  headers.set('accept-encoding', 'identity');

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  try {
    // Read the entire request body as raw bytes so the content-type boundary
    // (for multipart/form-data) and any binary content are forwarded exactly.
    const body = hasBody ? await req.arrayBuffer() : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body ?? undefined,
      redirect: 'manual', // forward redirects to browser (required for Google OAuth)
      // Opt out of Next.js fetch caching — this is a live proxy, never cache
      cache: 'no-store',
    });

    // Forward 3xx redirects directly to the browser
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) return NextResponse.redirect(location, { status: response.status });
    }

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) responseHeaders.set(key, value);
    });
    // Always prevent CDN/browser caching of API proxy responses
    responseHeaders.set('cache-control', 'no-store, no-cache, must-revalidate');

    // Buffer the response body to avoid streaming issues with Vercel's Edge Network
    const responseBody = await response.arrayBuffer();

    return new NextResponse(responseBody, {
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
