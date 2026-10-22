// Vercel Serverless Function — proxy ke PeopleBond HCMS
// Path: /api/proxy.js?path=/?ajaxoffices=1
// WAJIB: forward Cookie + Set-Cookie agar session peoplebond / officeqr hidup.

const https = require('https');

const TARGET_HOST = 'hr.yeusaigongroup.com';

module.exports = (req, res) => {
  const origin = req.headers.origin || '';

  // CORS — kalau ada Origin, echo balik (wajib untuk credentials)
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // --- parse path target ---
  let targetPath = '/';
  try {
    const reqUrl = new URL(req.url, 'http://localhost');
    let path = reqUrl.searchParams.get('path') || '/';
    // path sudah di-decode oleh URLSearchParams (mis. /?ajaxofficeqr=abc)
    reqUrl.searchParams.delete('path');
    const remaining = reqUrl.searchParams.toString();
    targetPath = path;
    if (remaining) {
      targetPath += (path.includes('?') ? '&' : '?') + remaining;
    }
    // pastikan diawali /
    if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
  } catch (e) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid path: ' + e.message }));
    return;
  }

  const forwardHeaders = {
    Host: TARGET_HOST,
    'User-Agent':
      req.headers['user-agent'] ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    Accept: req.headers.accept || '*/*',
    'Accept-Language': req.headers['accept-language'] || 'id-ID,id;q=0.9,en;q=0.8',
    // Jangan forward Accept-Encoding biar body tidak ter-compress aneh
    Connection: 'close',
  };

  // Teruskan cookie browser → upstream (peoplebond, officeqr, dll.)
  if (req.headers.cookie) {
    forwardHeaders.Cookie = req.headers.cookie;
  }

  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: targetPath,
    method: 'GET',
    headers: forwardHeaders,
    // timeout di-handle manual
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.statusCode = proxyRes.statusCode || 200;

    // Cache-Control — QR jangan di-cache
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    // --- Set-Cookie: bersihkan Domain, paksa Path=/, SameSite=None; Secure ---
    let rawCookies = proxyRes.headers['set-cookie'];
    if (rawCookies) {
      if (!Array.isArray(rawCookies)) rawCookies = [rawCookies];

      const cleaned = rawCookies.map((cookie) => {
        let c = String(cookie)
          .replace(/;\s*Domain=[^;]*/gi, '')
          .replace(/;\s*SameSite=[^;]*/gi, '')
          .replace(/;\s*Secure/gi, '')
          .replace(/;\s*Path=[^;]*/gi, '');
        c += '; Path=/; SameSite=None; Secure';
        return c;
      });

      res.setHeader('Set-Cookie', cleaned);
    }

    // Buffer body: PeopleBond sering kirim PNG dengan Content-Type: text/html.
    // Deteksi magic bytes lalu set Content-Type yang benar.
    const chunks = [];
    proxyRes.on('data', (chunk) => chunks.push(chunk));
    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks);
      let ct = proxyRes.headers['content-type'] || 'application/octet-stream';

      if (body.length >= 8) {
        if (body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) {
          ct = 'image/png';
        } else if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
          ct = 'image/jpeg';
        } else if (body[0] === 0x47 && body[1] === 0x49 && body[2] === 0x46) {
          ct = 'image/gif';
        }
      }

      res.setHeader('Content-Type', ct);
      res.setHeader('Content-Length', String(body.length));
      res.end(body);
    });
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
    } else {
      res.end();
    }
  });

  proxyReq.setTimeout(25000, () => {
    proxyReq.destroy(new Error('Upstream timeout'));
  });

  proxyReq.end();
};
