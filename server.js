const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 8787);
const ROOT = __dirname;
const UPSTREAM = process.env.UPSTREAM || 'https://music-api.gdstudio.xyz/api.php';
const MOCK_API = process.env.MOCK_API === '1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      send(res, 404, 'text/plain; charset=utf-8', 'Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, MIME[ext] || 'application/octet-stream', content);
  });
}

function handleMockApi(res, requestUrl) {
  const type = requestUrl.searchParams.get('types');
  const source = requestUrl.searchParams.get('source') || 'netease';
  const keyword = requestUrl.searchParams.get('name') || '测试';
  const id = requestUrl.searchParams.get('id') || `${source}-1`;

  if (type === 'search') {
    send(
      res,
      200,
      'application/json; charset=utf-8',
      JSON.stringify([
        {
          id: `${source}-1`,
          name: `${keyword}（测试样例）`,
          artist: ['测试歌手'],
          album: '测试专辑',
        },
      ])
    );
    return;
  }

  if (type === 'url') {
    send(
      res,
      200,
      'application/json; charset=utf-8',
      JSON.stringify({ id, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' })
    );
    return;
  }

  if (type === 'lyric') {
    send(
      res,
      200,
      'application/json; charset=utf-8',
      JSON.stringify({ id, lyric: '测试歌词：如果你看到这行，说明弹窗请求成功。' })
    );
    return;
  }

  send(res, 400, 'application/json; charset=utf-8', JSON.stringify({ error: 'unsupported_mock_type' }));
}

async function handleApi(res, requestUrl) {
  if (MOCK_API) {
    handleMockApi(res, requestUrl);
    return;
  }

  try {
    const query = requestUrl.searchParams.toString();
    const target = query ? `${UPSTREAM}?${query}` : UPSTREAM;
    const upstream = await fetch(target);
    const body = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (error) {
    send(
      res,
      502,
      'application/json; charset=utf-8',
      JSON.stringify({ error: 'upstream_unavailable', message: String(error?.message || error) })
    );
  }
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === '/health') {
    send(
      res,
      200,
      'application/json; charset=utf-8',
      JSON.stringify({ ok: true, app: 'music_search_omni', port: PORT, root: ROOT, mockApi: MOCK_API })
    );
    return;
  }

  if (requestUrl.pathname === '/api') {
    handleApi(res, requestUrl);
    return;
  }

  const pathname = requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname.replace(/^\/+/, '');
  let filePath = path.normalize(path.join(ROOT, pathname));

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, 'index.html');
  }

  sendFile(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`music_search_omni server running at http://${HOST}:${PORT}`);
  console.log(`health check: http://127.0.0.1:${PORT}/health`);
  console.log(`mock api: ${MOCK_API ? 'enabled' : 'disabled'}`);
});
