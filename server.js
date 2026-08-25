const app = require('./src/app');
const { migrar } = require('./src/migrar');

const porta = process.env.PORT || 3000;

// Aplica o schema antes de subir: no Railway o banco nasce pronto no primeiro deploy.
migrar()
  .then(() => {
    app.listen(porta, () => {
      console.log(`API da programacao rodando na porta ${porta}`);
    });
  })
  .catch((erro) => {
    console.error('Nao foi possivel preparar o banco:', erro.message);
    process.exit(1);
  });
