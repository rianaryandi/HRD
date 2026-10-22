// ============================================================
//  VERCEL EDGE RUNTIME PROXY — cold start ~50ms (INSTAN)
//  Path: /api/proxy?path=/?ajaxoffices=1
// ============================================================
export const runtime = 'edge';

const TARGET_BASE = 'https://hr.yeusaigongroup.com';

export default async function handler(request) {
  // Preflight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Cookie',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  const url = new URL(request.url);
  let path = url.searchParams.get('path') || '/';
  url.searchParams.delete('path');
  const remaining = url.searchParams.toString();
  let targetPath = path;
  if (remaining) targetPath += (path.includes('?') ? '&' : '?') + remaining;

  // Forward cookie session peoplebond agar konsisten
  const fwdHeaders = new Headers();
  fwdHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36');
  fwdHeaders.set('X-Requested-With', 'XMLHttpRequest');
  fwdHeaders.set('Accept', request.headers.get('accept') || '*/*');
  const cookie = request.headers.get('cookie');
  if (cookie) fwdHeaders.set('Cookie', cookie);

  let upstream;
  try {
    upstream = await fetch(TARGET_BASE + targetPath, { headers: fwdHeaders, cache: 'no-store' });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  // Bangun header respons — forward Set-Cookie (bersihkan domain)
  const outHeaders = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) outHeaders.set('Content-Type', ct);
  const setCookies = upstream.headers.getSetCookie ? upstream.headers.getSetCookie() : [];
  for (const c of setCookies) {
    const cleaned = c.replace(/;\s*domain=[^;]*/gi, '').replace(/;\s*secure/gi, '') + '; SameSite=None; Secure';
    outHeaders.append('Set-Cookie', cleaned);
  }
  outHeaders.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
  outHeaders.set('Access-Control-Allow-Credentials', 'true');

  return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
}
