import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/time.js', ['time.js', 'text/javascript']],
  ['/agenda.json', ['agenda.json', 'application/json']],
]);

const port = Number(process.env.PORT ?? 8080);
createServer(async (request, response) => {
  const reply = (status, body, type = 'text/plain') => {
    response.writeHead(status, { 'Content-Type': `${type}; charset=utf-8` });
    response.end(request.method === 'HEAD' ? undefined : body);
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return reply(405, 'Method not allowed');
  }

  const path = request.url.split('?')[0];
  if (path === '/healthz') return reply(200, 'ok');

  const asset = assets.get(path);
  if (!asset) return reply(404, 'Not found');

  try {
    const [file, type] = asset;
    const body = await readFile(new URL(`./public/${file}`, import.meta.url));
    response.setHeader('Cache-Control', 'no-cache');
    reply(200, body, type);
  } catch (error) {
    console.error(error);
    reply(500, 'Unable to load the agenda');
  }
}).listen(port, '0.0.0.0', () => console.log(`Agenda listening on port ${port}`));
