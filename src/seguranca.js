// Protecao das rotas de gestao (conteudo, dados pessoais, configuracao).
// Com CHAVE_ADMIN definida no ambiente, essas rotas exigem
// "Authorization: Bearer <chave>"; sem ela, ficam abertas como o resto da API -
// serve para desenvolvimento, nao use assim em producao.
function exigirChaveAdmin(req, res, next) {
  const chave = process.env.CHAVE_ADMIN;
  if (!chave) return next();
  if (req.get('Authorization') === `Bearer ${chave}`) return next();
  res.status(401).json({ erro: 'Informe a chave de acesso: Authorization: Bearer <CHAVE_ADMIN>.' });
}

module.exports = { exigirChaveAdmin };
