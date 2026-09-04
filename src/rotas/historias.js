// Estantes dos Skeelers: as historias reais de carreira que o app apresenta.
// O CRUD existe para o conteudo ser parametrizavel: o time insere/ajusta as
// historias selecionadas sem precisar de novo deploy.
const express = require('express');
const { query } = require('../db');
const { validarHistoria, TERRITORIOS } = require('../validacao');
const { exigirChaveAdmin } = require('../seguranca');

const router = express.Router();

const asy = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Leitura e publica (o app monta as estantes com ela); escrita e do painel.
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  exigirChaveAdmin(req, res, next);
});

router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id)) return res.status(404).json({ erro: 'Historia nao encontrada.' });
  next();
});

const COLUNAS = 'id, territorio, livro, livro_url, citacao, indicacao, foto, skeeler_nome, skeeler_cargo, resumo, trajetoria, ordem, ativo, criado_em, atualizado_em';

// GET /api/historias
// O app usa ?territorio=evoluir para montar a estante do resultado.
// Por padrao so vem historia ativa; ?todas=true traz tudo (gestao do conteudo).
router.get(
  '/',
  asy(async (req, res) => {
    const { territorio, todas } = req.query;

    const condicoes = [];
    const valores = [];

    if (territorio) {
      if (!TERRITORIOS.includes(territorio)) {
        return res.status(400).json({ erro: `territorio precisa ser um de: ${TERRITORIOS.join(', ')}.` });
      }
      valores.push(territorio);
      condicoes.push(`territorio = $${valores.length}`);
    }
    if (todas !== 'true') {
      condicoes.push('ativo = TRUE');
    }

    const onde = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ${COLUNAS} FROM historias ${onde} ORDER BY territorio, ordem, id`,
      valores
    );
    res.json({ total: rows.length, historias: rows });
  })
);

// GET /api/historias/:id
router.get(
  '/:id',
  asy(async (req, res) => {
    const { rows } = await query(`SELECT ${COLUNAS} FROM historias WHERE id = $1`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Historia nao encontrada.' });
    res.json(rows[0]);
  })
);

// POST /api/historias
router.post(
  '/',
  asy(async (req, res) => {
    const { dados, erros } = validarHistoria(req.body);
    if (erros) return res.status(400).json({ erros });

    const { rows } = await query(
      `INSERT INTO historias (territorio, livro, livro_url, citacao, indicacao, foto, skeeler_nome, skeeler_cargo, resumo, trajetoria, ordem, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING ${COLUNAS}`,
      [
        dados.territorio,
        dados.livro,
        dados.livro_url ?? null,
        dados.citacao,
        dados.indicacao ?? null,
        dados.foto ?? null,
        dados.skeeler_nome,
        dados.skeeler_cargo,
        dados.resumo ?? null,
        dados.trajetoria ?? '[]',
        dados.ordem ?? 0,
        dados.ativo ?? true,
      ]
    );
    res.status(201).json(rows[0]);
  })
);

// PATCH /api/historias/:id  (envie so os campos que quer mudar)
router.patch(
  '/:id',
  asy(async (req, res) => {
    const { dados, erros } = validarHistoria(req.body, { parcial: true });
    if (erros) return res.status(400).json({ erros });

    const campos = Object.keys(dados);
    const atribuicoes = campos.map((campo, i) => `${campo} = $${i + 1}`);
    const valores = campos.map((campo) => dados[campo]);

    const { rows } = await query(
      `UPDATE historias SET ${atribuicoes.join(', ')}, atualizado_em = now()
       WHERE id = $${campos.length + 1}
       RETURNING ${COLUNAS}`,
      [...valores, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Historia nao encontrada.' });
    res.json(rows[0]);
  })
);

// DELETE /api/historias/:id
router.delete(
  '/:id',
  asy(async (req, res) => {
    const { rowCount } = await query('DELETE FROM historias WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ erro: 'Historia nao encontrada.' });
    res.status(204).end();
  })
);

module.exports = router;
