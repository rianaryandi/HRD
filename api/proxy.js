// Vercel Serverless Function — pengganti proxy.php
// Path: /api/proxy?path=/?ajaxoffices=1
// Men-forward request ke https://hr.yeusaigongroup.com sambil menjaga cookie session.
const https = require('https');

const TARGET_HOST = 'hr.yeusaigongroup.com';

module.exports = (req, res) => {
  // CORS agar bisa dipanggil dari mana saja (termasuk GitHub Pages)
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  // Parse path dari query
  const reqUrl = new URL(req.url, 'http://localhost');
  let path = reqUrl.searchParams.get('path') || '/';
  // Hapus param 'path' dari query yang akan diteruskan
  reqUrl.searchParams.delete('path');
  const remainingQuery = reqUrl.searchParams.toString();

  // Bangun path target
  let targetPath = path;
  if (remainingQuery) {
    targetPath += (path.includes('?') ? '&' : '?') + remainingQuery;
  }

  // Forward cookie dari browser agar session peoplebond konsisten
  const forwardHeaders = {
    'Host': TARGET_HOST,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': req.headers.accept || '*/*',
  };
  if (req.headers.cookie) forwardHeaders['Cookie'] = req.headers.cookie;

  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: targetPath,
    method: 'GET',
    headers: forwardHeaders,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // Set status & content-type dari upstream
    res.statusCode = proxyRes.statusCode || 200;
    const ct = proxyRes.headers['content-type'];
    if (ct) res.setHeader('Content-Type', ct);

    // Forward Set-Cookie (bisa multiple) — bersihkan domain agar berlaku di domain Vercel/GitHub
    const setCookies = proxyRes.headers['set-cookie'];
    if (setCookies) {
      const cleaned = (Array.isArray(setCookies) ? setCookies : [setCookies]).map(c =>
        c.replace(/;\s*domain=[^;]*/gi, '').replace(/;\s*secure/gi, '') + '; SameSite=None; Secure'
      );
      res.setHeader('Set-Cookie', cleaned);
    }

    // Pipe body (teks maupun gambar QR) langsung ke client
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
  });

  proxyReq.setTimeout(30000, () => proxyReq.destroy());
  proxyReq.end();
};
