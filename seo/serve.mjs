/**
 * Local HTTP server that mirrors the nginx.conf routing used in production.
 * Serves the same URL layout the Cloud Run container exposes — so scripts and
 * tests can drive the real pages at http://127.0.0.1:PORT without Docker.
 *
 *   import { startServer } from './seo/serve.mjs';
 *   const { url, close } = await startServer(8099);
 *   ... work ...
 *   await close();
 */
import http from 'http';
import { readFile, stat } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv':  'text/csv; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const ROUTES = {
  '/':                            'landingpage.html',
  '/calculator':                  'ai-cost-calculator.html',
  '/calculator/':                 'ai-cost-calculator.html',
  '/calculator/methodology':      'ai-calculator-methodology.html',
  '/calculator/methodology/':     'ai-calculator-methodology.html',
};

async function tryFile(rel) {
  try {
    const abs = join(ROOT, rel);
    const s = await stat(abs);
    if (s.isDirectory()) return null;
    return abs;
  } catch { return null; }
}

async function resolve(pathname) {
  if (ROUTES[pathname]) return join(ROOT, ROUTES[pathname]);
  const trimmed = pathname.replace(/^\/+/, '');
  const direct = await tryFile(trimmed);
  if (direct) return direct;
  const indexed = await tryFile(join(trimmed, 'index.html'));
  if (indexed) return indexed;
  const htmled = await tryFile(trimmed + '.html');
  if (htmled) return htmled;
  return null;
}

export function startServer(port = 8099) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const file = await resolve(url.pathname);
      if (!file) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not found');
      }
      const buf = await readFile(file);
      const ext = extname(file).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.js' ? 'no-store' : 'public, max-age=60',
      });
      res.end(buf);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error: ' + e.message);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise(r => server.close(() => r())),
      });
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2]) || 8099;
  startServer(port).then(s => console.log(`Serving ${ROOT} at ${s.url}`));
}
