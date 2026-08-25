// Testes de integracao contra um Postgres real.
// Rode com um banco de teste: DATABASE_URL=postgres://...:5432/bienal_teste npm run teste:api
const test = require('node:test');
const assert = require('node:assert');

const url = process.env.DATABASE_URL || '';
const ehLocal = /localhost|127\.0\.0\.1/.test(url);
if (!ehLocal && process.env.PERMITIR_TESTE_REMOTO !== 'true') {
  console.error(
    'Os testes apagam os dados da tabela eventos. Aponte DATABASE_URL para um banco local\n' +
      'ou exporte PERMITIR_TESTE_REMOTO=true se tiver certeza.'
  );
  process.exit(1);
}

const app = require('../src/app');
const { migrar } = require('../src/migrar');
const { query, pool } = require('../src/db');

let servidor;
let base;

async function req(caminho, opcoes = {}) {
  const resposta = await fetch(`${base}${caminho}`, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
  });
  const texto = await resposta.text();
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
}

test.before(async () => {
  await migrar();
  await query('TRUNCATE eventos RESTART IDENTITY');
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

test.after(async () => {
  await new Promise((r) => servidor.close(r));
  await pool.end();
});

test('GET /health responde ok com o banco no ar', async () => {
  const { status, corpo } = await req('/health');
  assert.equal(status, 200);
  assert.equal(corpo.banco, 'ok');
});

test('POST /api/eventos cria um evento', async () => {
  const { status, corpo } = await req('/api/eventos', {
    method: 'POST',
    corpo: {
      titulo: 'Mesa de abertura',
      descricao: 'Conversa inicial',
      inicio: '2026-09-04T14:00:00-03:00',
      fim: '2026-09-04T15:30:00-03:00',
      local: 'Palco Principal',
      categoria: 'Mesa redonda',
      participantes: ['Convidada', 'Mediadora'],
      destaque: true,
    },
  });
  assert.equal(status, 201);
  assert.equal(corpo.titulo, 'Mesa de abertura');
  assert.deepEqual(corpo.participantes, ['Convidada', 'Mediadora']);
  assert.equal(corpo.destaque, true);
  assert.ok(corpo.id > 0);
});

test('POST rejeita evento sem titulo e sem inicio', async () => {
  const { status, corpo } = await req('/api/eventos', { method: 'POST', corpo: { local: 'Sala Azul' } });
  assert.equal(status, 400);
  assert.ok(corpo.erros.some((e) => e.includes('titulo')));
  assert.ok(corpo.erros.some((e) => e.includes('inicio')));
});

test('POST rejeita fim antes do inicio', async () => {
  const { status, corpo } = await req('/api/eventos', {
    method: 'POST',
    corpo: { titulo: 'Invertido', inicio: '2026-09-04T16:00:00-03:00', fim: '2026-09-04T15:00:00-03:00' },
  });
  assert.equal(status, 400);
  assert.ok(corpo.erros.some((e) => e.includes('fim precisa ser depois')));
});

test('GET /api/eventos lista e filtra', async () => {
  await req('/api/eventos', {
    method: 'POST',
    corpo: {
      titulo: 'Oficina de escrita',
      inicio: '2026-09-05T09:30:00-03:00',
      local: 'Espaco Oficinas',
      categoria: 'Oficina',
      participantes: ['Oficineira'],
    },
  });

  const todos = await req('/api/eventos');
  assert.equal(todos.status, 200);
  assert.equal(todos.corpo.total, 2);
  // ordenado por inicio ascendente
  assert.equal(todos.corpo.eventos[0].titulo, 'Mesa de abertura');

  const porData = await req('/api/eventos?data=2026-09-05');
  assert.equal(porData.corpo.total, 1);
  assert.equal(porData.corpo.eventos[0].titulo, 'Oficina de escrita');

  const porCategoria = await req('/api/eventos?categoria=Oficina');
  assert.equal(porCategoria.corpo.total, 1);

  const porDestaque = await req('/api/eventos?destaque=true');
  assert.equal(porDestaque.corpo.total, 1);
  assert.equal(porDestaque.corpo.eventos[0].titulo, 'Mesa de abertura');

  // busca cobre titulo, descricao e participantes
  const porParticipante = await req('/api/eventos?busca=oficineira');
  assert.equal(porParticipante.corpo.total, 1);
});

test('GET /api/eventos pagina os resultados', async () => {
  const p1 = await req('/api/eventos?limite=1&pagina=1');
  const p2 = await req('/api/eventos?limite=1&pagina=2');
  assert.equal(p1.corpo.eventos.length, 1);
  assert.equal(p2.corpo.eventos.length, 1);
  assert.notEqual(p1.corpo.eventos[0].id, p2.corpo.eventos[0].id);
  assert.equal(p1.corpo.total, 2);
});

test('GET /api/eventos/:id devolve 404 para id inexistente ou invalido', async () => {
  assert.equal((await req('/api/eventos/9999')).status, 404);
  assert.equal((await req('/api/eventos/abc')).status, 404);
});

test('PATCH atualiza so os campos enviados', async () => {
  const criado = await req('/api/eventos', {
    method: 'POST',
    corpo: { titulo: 'Titulo antigo', inicio: '2026-09-06T11:00:00-03:00', local: 'Espaco Infantil' },
  });
  const { status, corpo } = await req(`/api/eventos/${criado.corpo.id}`, {
    method: 'PATCH',
    corpo: { titulo: 'Titulo novo' },
  });
  assert.equal(status, 200);
  assert.equal(corpo.titulo, 'Titulo novo');
  assert.equal(corpo.local, 'Espaco Infantil'); // preservado
});

test('PATCH valida o fim contra o inicio ja gravado', async () => {
  const criado = await req('/api/eventos', {
    method: 'POST',
    corpo: { titulo: 'Com horario', inicio: '2026-09-07T10:00:00-03:00' },
  });
  const { status } = await req(`/api/eventos/${criado.corpo.id}`, {
    method: 'PATCH',
    corpo: { fim: '2026-09-07T09:00:00-03:00' },
  });
  assert.equal(status, 400);
});

test('PATCH sem nenhum campo devolve 400', async () => {
  const { status } = await req('/api/eventos/1', { method: 'PATCH', corpo: {} });
  assert.equal(status, 400);
});

test('DELETE remove o evento', async () => {
  const criado = await req('/api/eventos', {
    method: 'POST',
    corpo: { titulo: 'Para apagar', inicio: '2026-09-08T10:00:00-03:00' },
  });
  assert.equal((await req(`/api/eventos/${criado.corpo.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await req(`/api/eventos/${criado.corpo.id}`)).status, 404);
  assert.equal((await req(`/api/eventos/${criado.corpo.id}`, { method: 'DELETE' })).status, 404);
});

test('GET /api/categorias e /api/locais agregam a grade', async () => {
  const categorias = await req('/api/categorias');
  assert.equal(categorias.status, 200);
  assert.ok(categorias.corpo.some((c) => c.categoria === 'Oficina' && c.total === 1));

  const locais = await req('/api/locais');
  assert.ok(locais.corpo.some((l) => l.local === 'Palco Principal'));
});

test('rota inexistente devolve 404 em JSON', async () => {
  const { status, corpo } = await req('/nao-existe');
  assert.equal(status, 404);
  assert.ok(corpo.erro.includes('Rota nao encontrada'));
});

test('JSON malformado devolve 400', async () => {
  const resposta = await fetch(`${base}/api/eventos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ isso nao e json',
  });
  assert.equal(resposta.status, 400);
});
