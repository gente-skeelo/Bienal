// Popula a tabela com alguns eventos de exemplo para dar o que testar no front.
// Roda com: npm run seed
const { migrar } = require('./migrar');
const { query, pool } = require('./db');

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

async function semear() {
  await migrar();

  const { rows } = await query('SELECT count(*)::int AS total FROM eventos');
  if (rows[0].total > 0) {
    console.log(`A tabela ja tem ${rows[0].total} evento(s). Nada foi inserido.`);
    console.log('Para recomecar do zero: npm run seed -- --limpar');
    if (!process.argv.includes('--limpar')) return;
    await query('TRUNCATE eventos RESTART IDENTITY');
    console.log('Tabela limpa.');
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

semear()
  .then(() => pool.end())
  .catch((erro) => {
    console.error('Falha ao popular:', erro.message);
    process.exit(1);
  });
