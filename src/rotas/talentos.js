// Estante de Talentos: porta permanente de relacionamento com quem quer ficar
// perto dos proximos capitulos do Skeelo. A entrada e opcional e nao interfere
// no acesso ao resultado do quiz nem ao brinde.
const express = require('express');
const { query } = require('../db');
const { validarTalento } = require('../validacao');

const router = express.Router();

const asy = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// A listagem expoe dados pessoais. Com CHAVE_ADMIN definida no ambiente, so o
// time de People acessa (Authorization: Bearer <chave>); sem ela, fica aberta
// como o resto da API - nao use assim em producao.
function exigirChaveAdmin(req, res, next) {
  const chave = process.env.CHAVE_ADMIN;
  if (!chave) return next();
  if (req.get('Authorization') === `Bearer ${chave}`) return next();
  res.status(401).json({ erro: 'Informe a chave de acesso: Authorization: Bearer <CHAVE_ADMIN>.' });
}

// POST /api/talentos - inscricao vinda do app.
// Quem se inscreve de novo com o mesmo e-mail atualiza o proprio cadastro.
router.post(
  '/',
  asy(async (req, res) => {
    const { dados, erros } = validarTalento(req.body);
    if (erros) return res.status(400).json({ erros });

    const { rows } = await query(
      `INSERT INTO talentos (nome, email, area_interesse, linkedin, mensagem, territorio, consentimento)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (lower(email)) DO UPDATE SET
         nome = EXCLUDED.nome,
         area_interesse = COALESCE(EXCLUDED.area_interesse, talentos.area_interesse),
         linkedin = COALESCE(EXCLUDED.linkedin, talentos.linkedin),
         mensagem = COALESCE(EXCLUDED.mensagem, talentos.mensagem),
         territorio = COALESCE(EXCLUDED.territorio, talentos.territorio),
         consentimento = EXCLUDED.consentimento,
         atualizado_em = now()
       RETURNING id, nome, email, area_interesse, linkedin, mensagem, territorio, consentimento, criado_em, atualizado_em,
                 (criado_em = atualizado_em) AS novo`,
      [dados.nome, dados.email, dados.area_interesse, dados.linkedin, dados.mensagem, dados.territorio, dados.consentimento]
    );
    res.status(rows[0].novo ? 201 : 200).json(rows[0]);
  })
);

// GET /api/talentos - listagem para o time de People (protegida por CHAVE_ADMIN).
router.get(
  '/',
  exigirChaveAdmin,
  asy(async (req, res) => {
    const { rows } = await query(
      `SELECT id, nome, email, area_interesse, linkedin, mensagem, territorio, consentimento, criado_em, atualizado_em
       FROM talentos ORDER BY criado_em DESC`
    );
    res.json({ total: rows.length, talentos: rows });
  })
);

module.exports = router;
