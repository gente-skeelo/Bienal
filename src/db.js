const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'DATABASE_URL nao esta definida.\n' +
      'No Railway: adicione o banco Postgres ao projeto e a variavel e injetada automaticamente.\n' +
      'Local: copie .env.example para .env e exporte a variavel antes de rodar.'
  );
  process.exit(1);
}

// A rede interna do Railway (host *.railway.internal) nao usa SSL.
// A URL publica (host *.rlwy.net) exige. Detectamos pelo host para nao precisar
// mexer em configuracao ao alternar entre os dois.
const hostLocalOuInterno = /localhost|127\.0\.0\.1|\.railway\.internal/.test(connectionString);
const usarSSL = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL === 'true'
  : !hostLocalOuInterno;

const pool = new Pool({
  connectionString,
  ssl: usarSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (erro) => {
  console.error('Erro inesperado no pool do Postgres:', erro.message);
});

// Atalho: db.query('SELECT ...', [param1, param2])
function query(texto, parametros) {
  return pool.query(texto, parametros);
}

module.exports = { pool, query };
