const express = require('express');
const cors = require('cors');
const { query } = require('./db');
const eventos = require('./rotas/eventos');

const app = express();

app.use(cors()); // libera o consumo da API por qualquer front (site, app, etc.)
app.use(express.json());

// Pagina inicial: serve de mapa da API quando alguem abre a URL no navegador.
app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<meta charset="utf-8">
<title>API da Programacao - Bienal</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.6; }
  code { background: #f1f1f1; padding: .1rem .3rem; border-radius: .2rem; }
  li { margin: .3rem 0; }
</style>
<h1>API da Programacao &mdash; Bienal</h1>
<p>Backend no ar. Endpoints disponiveis:</p>
<ul>
  <li><code>GET /health</code> &mdash; status da API e do banco</li>
  <li><code>GET /api/eventos</code> &mdash; lista a programacao (filtros: <code>data</code>, <code>categoria</code>, <code>local</code>, <code>destaque</code>, <code>busca</code>, <code>limite</code>, <code>pagina</code>)</li>
  <li><code>GET /api/eventos/:id</code> &mdash; um evento</li>
  <li><code>POST /api/eventos</code> &mdash; cria evento</li>
  <li><code>PATCH /api/eventos/:id</code> &mdash; atualiza evento</li>
  <li><code>DELETE /api/eventos/:id</code> &mdash; remove evento</li>
  <li><code>GET /api/categorias</code> e <code>GET /api/locais</code> &mdash; valores em uso na grade</li>
</ul>
<p>Exemplo: <a href="/api/eventos">/api/eventos</a></p>`);
});

// Healthcheck usado pelo Railway. Consulta o banco para nao dar "verde" com o
// Postgres fora do ar.
app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', banco: 'ok', uptime: process.uptime() });
  } catch (erro) {
    res.status(503).json({ status: 'degradado', banco: 'indisponivel', detalhe: erro.message });
  }
});

app.use('/api/eventos', eventos);

// Listas auxiliares para montar filtros no front sem chumbar valores.
app.get('/api/categorias', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT categoria, count(*)::int AS total FROM eventos
       WHERE categoria IS NOT NULL AND categoria <> '' GROUP BY categoria ORDER BY categoria`
    );
    res.json(rows);
  } catch (erro) {
    next(erro);
  }
});

app.get('/api/locais', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT local, count(*)::int AS total FROM eventos
       WHERE local IS NOT NULL AND local <> '' GROUP BY local ORDER BY local`
    );
    res.json(rows);
  } catch (erro) {
    next(erro);
  }
});

app.use((req, res) => {
  res.status(404).json({ erro: `Rota nao encontrada: ${req.method} ${req.path}` });
});

// JSON malformado no corpo cai aqui como SyntaxError.
app.use((erro, req, res, next) => {
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON invalido no corpo da requisicao.' });
  }
  console.error('Erro nao tratado:', erro);
  res.status(500).json({ erro: 'Erro interno.' });
});

module.exports = app;
