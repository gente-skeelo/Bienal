const http = require('http');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>Bienal</title><h1>Bienal</h1><p>Aplicacao no ar.</p>');
});

server.listen(port, () => {
  console.log(`Bienal rodando na porta ${port}`);
});
