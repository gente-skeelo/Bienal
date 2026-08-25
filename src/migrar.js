const fs = require('fs');
const path = require('path');
const { query } = require('./db');

// Aplica o schema. Como tudo e "IF NOT EXISTS", rodar varias vezes e seguro:
// chamamos isso no start do servidor para o banco nascer pronto no Railway.
async function migrar() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await query(sql);
  console.log('Schema aplicado.');
}

module.exports = { migrar };

if (require.main === module) {
  migrar()
    .then(() => process.exit(0))
    .catch((erro) => {
      console.error('Falha ao aplicar o schema:', erro.message);
      process.exit(1);
    });
}
