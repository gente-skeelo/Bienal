// Estante de Talentos: porta permanente de relacionamento com quem quer ficar
// perto dos proximos capitulos do Skeelo. Desde a decisao de 28/08 o cadastro
// e obrigatorio para concluir a experiencia e ganhar o brinde; o voucher do
// livro e enviado depois por e-mail (acao de CRM), nao na hora.
const express = require('express');
const { query } = require('../db');
const { validarTalento } = require('../validacao');
const { exigirChaveAdmin } = require('../seguranca');

const router = express.Router();

const asy = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// POST /api/talentos - inscricao vinda do app.
// Quem se inscreve de novo com o mesmo e-mail atualiza o proprio cadastro.
router.post(
  '/',
  asy(async (req, res) => {
    const { dados, erros } = validarTalento(req.body);
    if (erros) return res.status(400).json({ erros });

    const { rows } = await query(
      `INSERT INTO talentos (nome, email, telefone, area_interesse, linkedin, mensagem, territorio, consentimento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (lower(email)) DO UPDATE SET
         nome = EXCLUDED.nome,
         telefone = COALESCE(EXCLUDED.telefone, talentos.telefone),
         area_interesse = COALESCE(EXCLUDED.area_interesse, talentos.area_interesse),
         linkedin = COALESCE(EXCLUDED.linkedin, talentos.linkedin),
         mensagem = COALESCE(EXCLUDED.mensagem, talentos.mensagem),
         territorio = COALESCE(EXCLUDED.territorio, talentos.territorio),
         consentimento = EXCLUDED.consentimento,
         atualizado_em = now()
       RETURNING id, nome, email, telefone, area_interesse, linkedin, mensagem, territorio, consentimento, criado_em, atualizado_em,
                 (criado_em = atualizado_em) AS novo`,
      [dados.nome, dados.email, dados.telefone, dados.area_interesse, dados.linkedin, dados.mensagem, dados.territorio, dados.consentimento]
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
      `SELECT id, nome, email, telefone, area_interesse, linkedin, mensagem, territorio, consentimento, criado_em, atualizado_em
       FROM talentos ORDER BY criado_em DESC`
    );
    res.json({ total: rows.length, talentos: rows });
  })
);

module.exports = router;
