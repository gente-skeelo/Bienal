// Analytics essenciais do app "Proximo Capitulo": o suficiente para responder
// se a experiencia funcionou (quiz -> territorio -> historia -> carreira ->
// Estante de Talentos), sem rastrear nada alem disso.
const express = require('express');
const { query } = require('../db');
const { validarMetrica } = require('../validacao');

const router = express.Router();

const asy = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// POST /api/metricas - o front registra um evento por interacao.
router.post(
  '/',
  asy(async (req, res) => {
    const { dados, erros } = validarMetrica(req.body);
    if (erros) return res.status(400).json({ erros });

    await query(
      `INSERT INTO metricas (evento, territorio, historia_id, sessao) VALUES ($1, $2, $3, $4)`,
      [dados.evento, dados.territorio, dados.historia_id, dados.sessao]
    );
    res.status(201).json({ ok: true });
  })
);

// GET /api/metricas/resumo - visao agregada da experiencia.
// total = interacoes; sessoes = visitantes unicos (por sessao do navegador).
router.get(
  '/resumo',
  asy(async (req, res) => {
    const porEvento = await query(
      `SELECT evento, count(*)::int AS total, count(DISTINCT sessao)::int AS sessoes
       FROM metricas GROUP BY evento ORDER BY evento`
    );
    const porTerritorio = await query(
      `SELECT territorio, count(*)::int AS total
       FROM metricas WHERE evento = 'territory_result' AND territorio IS NOT NULL
       GROUP BY territorio ORDER BY territorio`
    );
    const historias = await query(
      `SELECT m.historia_id, h.livro, h.skeeler_nome, count(*)::int AS visualizacoes
       FROM metricas m LEFT JOIN historias h ON h.id = m.historia_id
       WHERE m.evento = 'skeeler_story_viewed' AND m.historia_id IS NOT NULL
       GROUP BY m.historia_id, h.livro, h.skeeler_nome
       ORDER BY visualizacoes DESC, m.historia_id`
    );
    res.json({
      por_evento: porEvento.rows,
      territorios: porTerritorio.rows,
      historias_mais_vistas: historias.rows,
    });
  })
);

module.exports = router;
