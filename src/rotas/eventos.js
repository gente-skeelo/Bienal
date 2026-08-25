const express = require('express');
const { query } = require('../db');
const { validarEvento } = require('../validacao');

const router = express.Router();

// Envolve handlers async para que qualquer erro caia no middleware de erro.
const asy = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Todo :id precisa ser um inteiro; se nao for, ja respondemos 404 em vez de
// deixar o Postgres estourar erro de tipo.
router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id)) return res.status(404).json({ erro: 'Evento nao encontrado.' });
  next();
});

const COLUNAS = 'id, titulo, descricao, inicio, fim, local, categoria, participantes, destaque, criado_em, atualizado_em';

// GET /api/eventos
// Filtros opcionais: ?data=2026-09-05  ?categoria=  ?local=  ?destaque=true
//                    ?busca=texto  ?limite=50  ?pagina=1
router.get(
  '/',
  asy(async (req, res) => {
    const { data, categoria, local, destaque, busca } = req.query;

    const condicoes = [];
    const valores = [];

    if (data) {
      if (Number.isNaN(Date.parse(data))) {
        return res.status(400).json({ erro: 'data precisa estar no formato YYYY-MM-DD.' });
      }
      // Compara pelo dia no fuso de Sao Paulo, que e como a grade e divulgada.
      valores.push(data);
      condicoes.push(`(inicio AT TIME ZONE 'America/Sao_Paulo')::date = $${valores.length}::date`);
    }
    if (categoria) {
      valores.push(categoria);
      condicoes.push(`categoria ILIKE $${valores.length}`);
    }
    if (local) {
      valores.push(local);
      condicoes.push(`local ILIKE $${valores.length}`);
    }
    if (destaque !== undefined) {
      valores.push(destaque === 'true');
      condicoes.push(`destaque = $${valores.length}`);
    }
    if (busca) {
      valores.push(`%${busca}%`);
      const i = valores.length;
      condicoes.push(
        `(titulo ILIKE $${i} OR descricao ILIKE $${i} OR array_to_string(participantes, ' ') ILIKE $${i})`
      );
    }

    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 100, 1), 200);
    const pagina = Math.max(parseInt(req.query.pagina, 10) || 1, 1);
    const deslocamento = (pagina - 1) * limite;

    const onde = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

    const total = await query(`SELECT count(*)::int AS total FROM eventos ${onde}`, valores);
    const { rows } = await query(
      `SELECT ${COLUNAS} FROM eventos ${onde} ORDER BY inicio ASC, titulo ASC
       LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
      [...valores, limite, deslocamento]
    );

    res.json({ total: total.rows[0].total, pagina, limite, eventos: rows });
  })
);

// GET /api/eventos/:id
router.get(
  '/:id',
  asy(async (req, res) => {
    const { rows } = await query(`SELECT ${COLUNAS} FROM eventos WHERE id = $1`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Evento nao encontrado.' });
    res.json(rows[0]);
  })
);

// POST /api/eventos
router.post(
  '/',
  asy(async (req, res) => {
    const { dados, erros } = validarEvento(req.body);
    if (erros) return res.status(400).json({ erros });

    const { rows } = await query(
      `INSERT INTO eventos (titulo, descricao, inicio, fim, local, categoria, participantes, destaque)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${COLUNAS}`,
      [
        dados.titulo,
        dados.descricao ?? null,
        dados.inicio,
        dados.fim ?? null,
        dados.local ?? null,
        dados.categoria ?? null,
        dados.participantes ?? [],
        dados.destaque ?? false,
      ]
    );
    res.status(201).json(rows[0]);
  })
);

// PATCH /api/eventos/:id  (envie so os campos que quer mudar)
router.patch(
  '/:id',
  asy(async (req, res) => {
    const { dados, erros } = validarEvento(req.body, { parcial: true });
    if (erros) return res.status(400).json({ erros });

    // Se so um dos dois horarios foi enviado, valida contra o que ja esta no banco.
    if ((dados.inicio && !dados.fim) || (dados.fim && !dados.inicio)) {
      const atual = await query('SELECT inicio, fim FROM eventos WHERE id = $1', [req.params.id]);
      if (atual.rows.length === 0) return res.status(404).json({ erro: 'Evento nao encontrado.' });
      const inicio = new Date(dados.inicio ?? atual.rows[0].inicio);
      const fim = dados.fim === null ? null : new Date(dados.fim ?? atual.rows[0].fim);
      if (fim && fim <= inicio) {
        return res.status(400).json({ erros: ['fim precisa ser depois de inicio.'] });
      }
    }

    const campos = Object.keys(dados);
    const atribuicoes = campos.map((campo, i) => `${campo} = $${i + 1}`);
    const valores = campos.map((campo) => dados[campo]);

    const { rows } = await query(
      `UPDATE eventos SET ${atribuicoes.join(', ')}, atualizado_em = now()
       WHERE id = $${campos.length + 1}
       RETURNING ${COLUNAS}`,
      [...valores, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Evento nao encontrado.' });
    res.json(rows[0]);
  })
);

// DELETE /api/eventos/:id
router.delete(
  '/:id',
  asy(async (req, res) => {
    const { rowCount } = await query('DELETE FROM eventos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ erro: 'Evento nao encontrado.' });
    res.status(204).end();
  })
);

module.exports = router;
