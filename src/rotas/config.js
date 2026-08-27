// Configuracoes ajustaveis pelo painel /admin. A leitura e publica (o app usa
// para montar o botao de oportunidades); a escrita e protegida por CHAVE_ADMIN.
const express = require('express');
const { query } = require('../db');
const { exigirChaveAdmin } = require('../seguranca');

const router = express.Router();

const asy = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Chaves que existem hoje. Escrever em chave desconhecida e erro para o painel
// nao criar configuracao "fantasma" por typo.
const CHAVES = ['url_oportunidades'];

// GET /api/config -> { url_oportunidades: "https://..." }
router.get(
  '/',
  asy(async (req, res) => {
    const { rows } = await query('SELECT chave, valor FROM config');
    const config = Object.fromEntries(CHAVES.map((chave) => [chave, '']));
    for (const linha of rows) {
      if (CHAVES.includes(linha.chave)) config[linha.chave] = linha.valor;
    }
    res.json(config);
  })
);

// PATCH /api/config  (envie so as chaves que quer mudar)
router.patch(
  '/',
  exigirChaveAdmin,
  asy(async (req, res) => {
    const corpo = req.body;
    if (corpo === null || typeof corpo !== 'object' || Array.isArray(corpo)) {
      return res.status(400).json({ erros: ['O corpo da requisicao precisa ser um objeto JSON.'] });
    }

    const erros = [];
    const entradas = Object.entries(corpo);
    if (entradas.length === 0) erros.push('Envie ao menos uma configuracao para atualizar.');
    for (const [chave, valor] of entradas) {
      if (!CHAVES.includes(chave)) erros.push(`Configuracao desconhecida: ${chave}.`);
      else if (typeof valor !== 'string') erros.push(`${chave} precisa ser texto.`);
    }
    if (erros.length > 0) return res.status(400).json({ erros });

    for (const [chave, valor] of entradas) {
      await query(
        `INSERT INTO config (chave, valor) VALUES ($1, $2)
         ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now()`,
        [chave, valor.trim()]
      );
    }

    const { rows } = await query('SELECT chave, valor FROM config');
    res.json(Object.fromEntries(rows.filter((l) => CHAVES.includes(l.chave)).map((l) => [l.chave, l.valor])));
  })
);

module.exports = router;
