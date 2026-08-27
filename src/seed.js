// Popula as tabelas com exemplos para dar o que testar no front.
// Roda com: npm run seed
const { migrar } = require('./migrar');
const { query, pool } = require('./db');

// Historias de exemplo das Estantes dos Skeelers (3 por territorio), no formato
// do rascunho do app. Sao placeholders: as historias reais entram pela API
// (POST /api/historias) quando a selecao interna terminar.
const HISTORIAS = [
  {
    territorio: 'aprender',
    livro: '[Livro 1 — Aprender]',
    citacao: 'Esse livro me acompanhou quando precisei dominar um assunto do zero para um projeto novo.',
    skeeler_nome: 'Skeeler A',
    skeeler_cargo: 'Cargo',
    resumo: 'Primeiro contato com a área → estudo → referência do time',
    trajetoria: [
      { quando: '2023', marco: 'Entrou no Skeelo' },
      { quando: '2024', marco: 'Mergulhou em uma área nova' },
      { quando: 'Hoje', marco: 'É referência do time no assunto' },
    ],
    ordem: 1,
  },
  {
    territorio: 'aprender',
    livro: '[Livro 2 — Aprender]',
    citacao: 'Essa história trouxe o repertório que eu precisava para o meu primeiro grande desafio.',
    skeeler_nome: 'Skeeler B',
    skeeler_cargo: 'Cargo',
    resumo: 'Nova habilidade → prática → novo patamar',
    trajetoria: [
      { quando: '2022', marco: 'Entrou no Skeelo' },
      { quando: 'Hoje', marco: 'Aplica a habilidade em projetos maiores' },
    ],
    ordem: 2,
  },
  {
    territorio: 'aprender',
    livro: '[Livro 3 — Aprender]',
    citacao: 'Aprender com essa história mudou meu jeito de trabalhar.',
    skeeler_nome: 'Skeeler C',
    skeeler_cargo: 'Cargo',
    resumo: 'Curiosidade → especialização',
    trajetoria: [
      { quando: '2024', marco: 'Entrou no Skeelo' },
      { quando: 'Hoje', marco: 'Se especializou na área' },
    ],
    ordem: 3,
  },
  {
    territorio: 'evoluir',
    livro: '[Livro 1 — Evoluir]',
    citacao: 'Esse livro me acompanhou quando assumi meu primeiro desafio como liderança.',
    skeeler_nome: 'Mariana',
    skeeler_cargo: 'Engineering Manager',
    resumo: 'Software Engineer → novos projetos → liderança',
    trajetoria: [
      { quando: '2022', marco: 'Entrou no Skeelo como Software Engineer' },
      { quando: '2024', marco: 'Passou a liderar projetos estratégicos' },
      { quando: '2025', marco: 'Assumiu novas responsabilidades' },
      { quando: 'Hoje', marco: 'Lidera o time X' },
    ],
    ordem: 1,
  },
  {
    territorio: 'evoluir',
    livro: '[Livro 2 — Evoluir]',
    citacao: 'Essa história chegou quando eu precisava mudar minha forma de trabalhar.',
    skeeler_nome: 'João',
    skeeler_cargo: 'Product Manager',
    resumo: 'Novo escopo → nova forma de trabalhar',
    trajetoria: [
      { quando: '2023', marco: 'Entrou no Skeelo' },
      { quando: 'Hoje', marco: 'Cuida de um escopo maior' },
    ],
    ordem: 2,
  },
  {
    territorio: 'evoluir',
    livro: '[Livro 3 — Evoluir]',
    citacao: 'Essa história me acompanhou em uma virada importante da minha carreira.',
    skeeler_nome: 'Skeeler D',
    skeeler_cargo: 'Cargo',
    resumo: 'Desafio → transformação',
    trajetoria: [
      { quando: '2021', marco: 'Entrou no Skeelo' },
      { quando: 'Hoje', marco: 'Atua em um novo patamar' },
    ],
    ordem: 3,
  },
  {
    territorio: 'imaginar',
    livro: '[Livro 1 — Imaginar]',
    citacao: 'Esse livro me fez enxergar um caminho que eu ainda não tinha considerado.',
    skeeler_nome: 'Skeeler E',
    skeeler_cargo: 'Cargo',
    resumo: 'Mudança de área → novo caminho',
    trajetoria: [
      { quando: '2022', marco: 'Entrou no Skeelo em outra área' },
      { quando: '2024', marco: 'Migrou para uma nova área' },
      { quando: 'Hoje', marco: 'Constrói o novo caminho' },
    ],
    ordem: 1,
  },
  {
    territorio: 'imaginar',
    livro: '[Livro 2 — Imaginar]',
    citacao: 'Essa história abriu a pergunta “e se?” que mudou minha rota.',
    skeeler_nome: 'Skeeler F',
    skeeler_cargo: 'Cargo',
    resumo: 'Pergunta “e se?” → mudança de rota',
    trajetoria: [
      { quando: '2023', marco: 'Entrou no Skeelo' },
      { quando: 'Hoje', marco: 'Explora um caminho diferente' },
    ],
    ordem: 2,
  },
  {
    territorio: 'imaginar',
    livro: '[Livro 3 — Imaginar]',
    citacao: 'Essa história me ajudou a imaginar o que poderia vir depois.',
    skeeler_nome: 'Skeeler G',
    skeeler_cargo: 'Cargo',
    resumo: 'Visão de futuro → novo projeto',
    trajetoria: [
      { quando: '2024', marco: 'Entrou no Skeelo' },
      { quando: 'Hoje', marco: 'Tira uma ideia nova do papel' },
    ],
    ordem: 3,
  },
];

const EXEMPLOS = [
  {
    titulo: 'Abertura oficial da Bienal',
    descricao: 'Cerimonia de abertura com leitura de trechos e apresentacao da curadoria.',
    inicio: '2026-09-04T10:00:00-03:00',
    fim: '2026-09-04T11:00:00-03:00',
    local: 'Palco Principal',
    categoria: 'Cerimonia',
    participantes: ['Curadoria Bienal'],
    destaque: true,
  },
  {
    titulo: 'Mesa: o futuro da leitura digital',
    descricao: 'Conversa sobre habitos de leitura, audiobooks e acesso ao livro no Brasil.',
    inicio: '2026-09-04T14:00:00-03:00',
    fim: '2026-09-04T15:30:00-03:00',
    local: 'Sala Azul',
    categoria: 'Mesa redonda',
    participantes: ['Convidada 1', 'Convidado 2', 'Mediadora'],
    destaque: true,
  },
  {
    titulo: 'Oficina de escrita criativa',
    descricao: 'Oficina pratica para quem quer comecar a escrever. Vagas limitadas.',
    inicio: '2026-09-05T09:30:00-03:00',
    fim: '2026-09-05T12:00:00-03:00',
    local: 'Espaco Oficinas',
    categoria: 'Oficina',
    participantes: ['Oficineira convidada'],
    destaque: false,
  },
  {
    titulo: 'Sessao de autografos',
    descricao: 'Encontro com autoras e autores no estande central.',
    inicio: '2026-09-05T16:00:00-03:00',
    fim: '2026-09-05T18:00:00-03:00',
    local: 'Estande Central',
    categoria: 'Autografos',
    participantes: ['Autora convidada'],
    destaque: false,
  },
  {
    titulo: 'Contacao de historias para criancas',
    descricao: 'Atividade infantil com contacao de historias e brincadeiras.',
    inicio: '2026-09-06T11:00:00-03:00',
    fim: '2026-09-06T12:00:00-03:00',
    local: 'Espaco Infantil',
    categoria: 'Infantil',
    participantes: ['Grupo de contadores'],
    destaque: true,
  },
];

async function semearEventos() {
  const { rows } = await query('SELECT count(*)::int AS total FROM eventos');
  if (rows[0].total > 0) {
    console.log(`A tabela eventos ja tem ${rows[0].total} registro(s). Nada foi inserido.`);
    console.log('Para recomecar do zero: npm run seed -- --limpar');
    if (!process.argv.includes('--limpar')) return;
    await query('TRUNCATE eventos RESTART IDENTITY');
    console.log('Tabela eventos limpa.');
  }

  for (const evento of EXEMPLOS) {
    await query(
      `INSERT INTO eventos (titulo, descricao, inicio, fim, local, categoria, participantes, destaque)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        evento.titulo,
        evento.descricao,
        evento.inicio,
        evento.fim,
        evento.local,
        evento.categoria,
        evento.participantes,
        evento.destaque,
      ]
    );
  }
  console.log(`${EXEMPLOS.length} eventos de exemplo inseridos.`);
}

async function semearHistorias() {
  const { rows } = await query('SELECT count(*)::int AS total FROM historias');
  if (rows[0].total > 0) {
    console.log(`A tabela historias ja tem ${rows[0].total} registro(s). Nada foi inserido.`);
    if (!process.argv.includes('--limpar')) return;
    await query('TRUNCATE historias RESTART IDENTITY');
    console.log('Tabela historias limpa.');
  }

  for (const historia of HISTORIAS) {
    await query(
      `INSERT INTO historias (territorio, livro, citacao, skeeler_nome, skeeler_cargo, resumo, trajetoria, ordem)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        historia.territorio,
        historia.livro,
        historia.citacao,
        historia.skeeler_nome,
        historia.skeeler_cargo,
        historia.resumo,
        JSON.stringify(historia.trajetoria),
        historia.ordem,
      ]
    );
  }
  console.log(`${HISTORIAS.length} historias de exemplo inseridas nas Estantes dos Skeelers.`);
}

async function semear() {
  await migrar();
  await semearEventos();
  await semearHistorias();
}

semear()
  .then(() => pool.end())
  .catch((erro) => {
    console.error('Falha ao popular:', erro.message);
    process.exit(1);
  });
