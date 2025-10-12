const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '..');

// Serve static files
app.use(express.static(FRONTEND_DIR));

// Proxy API calls to Flask backend (your Flask is on 127.0.0.1:8080)
app.use(
  '/api',
  createProxyMiddleware({
    target: 'http://127.0.0.1:8080',
    changeOrigin: true,
  })
);

// Health check
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Express 5–safe SPA fallback (NO wildcard patterns)
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.originalUrl.startsWith('/api')) return next();
  if (path.extname(req.path)) return next(); // let static/404 handle assets
  return res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Optional 404 for anything else
app.use((req, res) => res.status(404).send('Not found'));

app.listen(PORT, () => {
  console.log(`✅ Frontend server running at http://localhost:${PORT}`);
});
