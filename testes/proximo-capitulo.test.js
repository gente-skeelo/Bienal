// Testes de integracao do app "Proximo Capitulo" (historias, talentos, metricas).
// Rode com um banco de teste: DATABASE_URL=postgres://...:5432/bienal_teste npm run teste:app
const test = require('node:test');
const assert = require('node:assert');

const url = process.env.DATABASE_URL || '';
const ehLocal = /localhost|127\.0\.0\.1/.test(url);
if (!ehLocal && process.env.PERMITIR_TESTE_REMOTO !== 'true') {
  console.error(
    'Os testes apagam os dados das tabelas historias, talentos e metricas. Aponte DATABASE_URL\n' +
      'para um banco local ou exporte PERMITIR_TESTE_REMOTO=true se tiver certeza.'
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

const HISTORIA = {
  territorio: 'evoluir',
  livro: 'Livro de teste',
  citacao: 'Esse livro me acompanhou quando assumi meu primeiro desafio como lideranca.',
  indicacao: 'Livro do acervo — Autora',
  foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==',
  skeeler_nome: 'Mariana',
  skeeler_cargo: 'Engineering Manager',
  resumo: 'Software Engineer -> novos projetos -> lideranca',
  trajetoria: [
    { quando: '2022', marco: 'Entrou como Software Engineer' },
    { quando: 'Hoje', marco: 'Lidera o time X' },
  ],
  ordem: 1,
};

test.before(async () => {
  await migrar();
  await query('TRUNCATE historias, talentos, metricas RESTART IDENTITY');
  await query(`UPDATE config SET valor = '' WHERE chave = 'url_oportunidades'`);
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

test.after(async () => {
  await new Promise((r) => servidor.close(r));
  await pool.end();
});

test('GET /app/ serve a experiencia mobile', async () => {
  const resposta = await fetch(`${base}/app/`);
  assert.equal(resposta.status, 200);
  assert.match(resposta.headers.get('content-type'), /text\/html/);
  const html = await resposta.text();
  assert.ok(html.includes('Próximo Capítulo — Skeelo na Bienal 2026')); // <title>, estavel a mudancas de layout
});

test('GET /admin/ serve o painel de gestao', async () => {
  const resposta = await fetch(`${base}/admin/`);
  assert.equal(resposta.status, 200);
  const html = await resposta.text();
  assert.ok(html.includes('Painel do Próximo Capítulo'));
});

// --- Historias (Estantes dos Skeelers) ---

test('POST /api/historias cria uma historia completa', async () => {
  const { status, corpo } = await req('/api/historias', { method: 'POST', corpo: HISTORIA });
  assert.equal(status, 201);
  assert.equal(corpo.territorio, 'evoluir');
  assert.equal(corpo.skeeler_nome, 'Mariana');
  assert.equal(corpo.ativo, true);
  assert.equal(corpo.indicacao, 'Livro do acervo — Autora');
  assert.ok(corpo.foto.startsWith('data:image/jpeg;base64,'));
  assert.deepEqual(corpo.trajetoria[0], { quando: '2022', marco: 'Entrou como Software Engineer' });
});

test('POST /api/historias valida a foto (data URL de imagem, tamanho limitado) e aceita null', async () => {
  const naoImagem = await req('/api/historias', { method: 'POST', corpo: { ...HISTORIA, foto: 'https://exemplo.com/foto.jpg' } });
  assert.equal(naoImagem.status, 400);
  assert.ok(naoImagem.corpo.erros.some((e) => e.includes('foto')));

  const grande = await req('/api/historias', {
    method: 'POST',
    corpo: { ...HISTORIA, foto: 'data:image/jpeg;base64,' + 'A'.repeat(160000) },
  });
  assert.equal(grande.status, 400);
  assert.ok(grande.corpo.erros.some((e) => e.includes('grande')));

  const semFoto = await req('/api/historias', { method: 'POST', corpo: { ...HISTORIA, foto: null, indicacao: null } });
  assert.equal(semFoto.status, 201);
  assert.equal(semFoto.corpo.foto, null);
  assert.equal(semFoto.corpo.indicacao, null);

  // Limpa para nao alterar as contagens dos testes de filtro que vem depois.
  assert.equal((await req(`/api/historias/${semFoto.corpo.id}`, { method: 'DELETE' })).status, 204);
});

test('POST /api/historias valida territorio, campos obrigatorios e trajetoria', async () => {
  const semNada = await req('/api/historias', { method: 'POST', corpo: {} });
  assert.equal(semNada.status, 400);
  assert.ok(semNada.corpo.erros.some((e) => e.includes('territorio')));
  assert.ok(semNada.corpo.erros.some((e) => e.includes('livro')));
  assert.ok(semNada.corpo.erros.some((e) => e.includes('citacao')));

  const territorioInvalido = await req('/api/historias', {
    method: 'POST',
    corpo: { ...HISTORIA, territorio: 'crescer' },
  });
  assert.equal(territorioInvalido.status, 400);

  const trajetoriaInvalida = await req('/api/historias', {
    method: 'POST',
    corpo: { ...HISTORIA, trajetoria: [{ ano: 2022 }] },
  });
  assert.equal(trajetoriaInvalida.status, 400);
  assert.ok(trajetoriaInvalida.corpo.erros.some((e) => e.includes('trajetoria')));
});

test('GET /api/historias filtra por territorio e esconde inativas', async () => {
  await req('/api/historias', {
    method: 'POST',
    corpo: { ...HISTORIA, territorio: 'aprender', skeeler_nome: 'Skeeler B', ordem: 1 },
  });
  const inativa = await req('/api/historias', {
    method: 'POST',
    corpo: { ...HISTORIA, skeeler_nome: 'Inativa', ativo: false },
  });
  assert.equal(inativa.status, 201);

  const todasAtivas = await req('/api/historias');
  assert.equal(todasAtivas.corpo.total, 2);

  const evoluir = await req('/api/historias?territorio=evoluir');
  assert.equal(evoluir.corpo.total, 1);
  assert.equal(evoluir.corpo.historias[0].skeeler_nome, 'Mariana');

  const comInativas = await req('/api/historias?todas=true');
  assert.equal(comInativas.corpo.total, 3);

  const territorioRuim = await req('/api/historias?territorio=crescer');
  assert.equal(territorioRuim.status, 400);
});

test('PATCH /api/historias/:id atualiza so os campos enviados', async () => {
  const criada = await req('/api/historias', { method: 'POST', corpo: HISTORIA });
  const { status, corpo } = await req(`/api/historias/${criada.corpo.id}`, {
    method: 'PATCH',
    corpo: { ativo: false, ordem: 9 },
  });
  assert.equal(status, 200);
  assert.equal(corpo.ativo, false);
  assert.equal(corpo.ordem, 9);
  assert.equal(corpo.skeeler_nome, 'Mariana'); // preservado

  const vazio = await req(`/api/historias/${criada.corpo.id}`, { method: 'PATCH', corpo: {} });
  assert.equal(vazio.status, 400);
});

test('DELETE /api/historias/:id remove e 404 para id invalido', async () => {
  const criada = await req('/api/historias', { method: 'POST', corpo: HISTORIA });
  assert.equal((await req(`/api/historias/${criada.corpo.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await req(`/api/historias/${criada.corpo.id}`)).status, 404);
  assert.equal((await req('/api/historias/abc')).status, 404);
});

// --- Estante de Talentos ---

test('POST /api/talentos exige nome, email valido e consentimento', async () => {
  const { status, corpo } = await req('/api/talentos', {
    method: 'POST',
    corpo: { nome: '', email: 'nao-e-email', consentimento: false },
  });
  assert.equal(status, 400);
  assert.ok(corpo.erros.some((e) => e.includes('nome')));
  assert.ok(corpo.erros.some((e) => e.includes('email')));
  assert.ok(corpo.erros.some((e) => e.includes('consentimento')));
  assert.ok(corpo.erros.some((e) => e.includes('maioridade')));
});

test('POST /api/talentos recusa quem nao declara 18 anos ou mais', async () => {
  const { status, corpo } = await req('/api/talentos', {
    method: 'POST',
    corpo: { nome: 'Menor', email: 'menor@exemplo.com', consentimento: true, maioridade: false },
  });
  assert.equal(status, 400);
  assert.ok(corpo.erros.some((e) => e.includes('maioridade')));
});

test('POST /api/talentos cria e reinscricao com o mesmo e-mail atualiza', async () => {
  const primeira = await req('/api/talentos', {
    method: 'POST',
    corpo: {
      nome: 'Visitante',
      email: 'Visitante@Exemplo.com',
      telefone: '(11) 91234-5678',
      area_interesse: 'Produto',
      territorio: 'imaginar',
      maioridade: true,
      consentimento: true,
    },
  });
  assert.equal(primeira.status, 201);
  assert.equal(primeira.corpo.email, 'visitante@exemplo.com'); // normalizado

  const segunda = await req('/api/talentos', {
    method: 'POST',
    corpo: { nome: 'Visitante Silva', email: 'visitante@exemplo.com', consentimento: true, maioridade: true },
  });
  assert.equal(segunda.status, 200); // atualizou em vez de duplicar
  assert.equal(segunda.corpo.nome, 'Visitante Silva');
  assert.equal(segunda.corpo.area_interesse, 'Produto'); // preservado
  assert.equal(segunda.corpo.telefone, '(11) 91234-5678'); // preservado
  assert.equal(segunda.corpo.maioridade, true);
  assert.equal(segunda.corpo.territorio, 'imaginar'); // preservado

  const lista = await req('/api/talentos');
  assert.equal(lista.status, 200);
  assert.equal(lista.corpo.total, 1);
});

test('CHAVE_ADMIN protege talentos, mutacoes de historias e config', async () => {
  process.env.CHAVE_ADMIN = 'segredo-de-teste';
  const autorizacao = { Authorization: 'Bearer segredo-de-teste' };
  try {
    assert.equal((await req('/api/talentos')).status, 401);
    assert.equal((await req('/api/talentos', { headers: autorizacao })).status, 200);

    // Leitura das historias continua publica (o app precisa dela); escrita nao.
    assert.equal((await req('/api/historias')).status, 200);
    assert.equal((await req('/api/historias', { method: 'POST', corpo: HISTORIA })).status, 401);
    const criada = await req('/api/historias', { method: 'POST', corpo: HISTORIA, headers: autorizacao });
    assert.equal(criada.status, 201);
    assert.equal(
      (await req(`/api/historias/${criada.corpo.id}`, { method: 'DELETE' })).status,
      401
    );
    assert.equal(
      (await req(`/api/historias/${criada.corpo.id}`, { method: 'DELETE', headers: autorizacao })).status,
      204
    );

    // Config: leitura publica, escrita protegida.
    assert.equal((await req('/api/config')).status, 200);
    assert.equal(
      (await req('/api/config', { method: 'PATCH', corpo: { url_oportunidades: 'https://x' } })).status,
      401
    );
  } finally {
    delete process.env.CHAVE_ADMIN;
  }
});

// --- Config ---

test('GET /api/config devolve as chaves conhecidas e PATCH atualiza', async () => {
  const inicial = await req('/api/config');
  assert.equal(inicial.status, 200);
  assert.equal(inicial.corpo.url_oportunidades, '');

  const salvo = await req('/api/config', {
    method: 'PATCH',
    corpo: { url_oportunidades: 'https://skeelo.exemplo/vagas' },
  });
  assert.equal(salvo.status, 200);
  assert.equal(salvo.corpo.url_oportunidades, 'https://skeelo.exemplo/vagas');

  const relido = await req('/api/config');
  assert.equal(relido.corpo.url_oportunidades, 'https://skeelo.exemplo/vagas');
});

test('PATCH /api/config rejeita chave desconhecida, valor nao-texto e corpo vazio', async () => {
  const desconhecida = await req('/api/config', { method: 'PATCH', corpo: { tema: 'roxo' } });
  assert.equal(desconhecida.status, 400);
  assert.ok(desconhecida.corpo.erros.some((e) => e.includes('desconhecida')));

  const naoTexto = await req('/api/config', { method: 'PATCH', corpo: { url_oportunidades: 42 } });
  assert.equal(naoTexto.status, 400);

  const vazio = await req('/api/config', { method: 'PATCH', corpo: {} });
  assert.equal(vazio.status, 400);
});

// --- Metricas ---

test('POST /api/metricas aceita eventos da lista e rejeita os demais', async () => {
  const ok = await req('/api/metricas', {
    method: 'POST',
    corpo: { evento: 'quiz_started', sessao: 'sessao-1' },
  });
  assert.equal(ok.status, 201);

  const comTerritorio = await req('/api/metricas', {
    method: 'POST',
    corpo: { evento: 'territory_result', territorio: 'evoluir', sessao: 'sessao-1' },
  });
  assert.equal(comTerritorio.status, 201);

  const desconhecido = await req('/api/metricas', {
    method: 'POST',
    corpo: { evento: 'hackeando', sessao: 'sessao-1' },
  });
  assert.equal(desconhecido.status, 400);

  const territorioRuim = await req('/api/metricas', {
    method: 'POST',
    corpo: { evento: 'territory_result', territorio: 'crescer' },
  });
  assert.equal(territorioRuim.status, 400);
});

test('GET /api/metricas/resumo agrega eventos, territorios e historias vistas', async () => {
  const historia = await req('/api/historias', { method: 'POST', corpo: HISTORIA });
  await req('/api/metricas', {
    method: 'POST',
    corpo: { evento: 'quiz_started', sessao: 'sessao-2' },
  });
  await req('/api/metricas', {
    method: 'POST',
    corpo: { evento: 'skeeler_story_viewed', territorio: 'evoluir', historia_id: historia.corpo.id, sessao: 'sessao-2' },
  });

  const { status, corpo } = await req('/api/metricas/resumo');
  assert.equal(status, 200);

  const quizStarted = corpo.por_evento.find((e) => e.evento === 'quiz_started');
  assert.equal(quizStarted.total, 2); // sessao-1 + sessao-2
  assert.equal(quizStarted.sessoes, 2);

  assert.ok(corpo.territorios.some((t) => t.territorio === 'evoluir' && t.total === 1));

  const maisVista = corpo.historias_mais_vistas[0];
  assert.equal(maisVista.historia_id, historia.corpo.id);
  assert.equal(maisVista.skeeler_nome, 'Mariana');
  assert.equal(maisVista.visualizacoes, 1);
});
