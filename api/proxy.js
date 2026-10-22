export default async function handler(req) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.searchParams.get('path') || '';
  const targetFullUrl = 'https://hr.yeusaigongroup.com/' + path;

  try {
    const res = await fetch(targetFullUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://hr.yeusaigongroup.com/'
      }
    });

    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'text/html',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
