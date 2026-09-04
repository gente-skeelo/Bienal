// Validacao simples e sem biblioteca: recebe o corpo da requisicao e devolve
// { dados } quando esta tudo certo ou { erros: [...] } com mensagens em portugues.

const CAMPOS = ['titulo', 'descricao', 'inicio', 'fim', 'local', 'categoria', 'participantes', 'destaque'];

function ehDataValida(valor) {
  return typeof valor === 'string' && !Number.isNaN(Date.parse(valor));
}

function validarEvento(corpo, { parcial = false } = {}) {
  const erros = [];
  const dados = {};

  if (corpo === null || typeof corpo !== 'object' || Array.isArray(corpo)) {
    return { erros: ['O corpo da requisicao precisa ser um objeto JSON.'] };
  }

  const desconhecidos = Object.keys(corpo).filter((campo) => !CAMPOS.includes(campo));
  if (desconhecidos.length > 0) {
    erros.push(`Campos nao reconhecidos: ${desconhecidos.join(', ')}.`);
  }

  // titulo
  if (corpo.titulo !== undefined) {
    if (typeof corpo.titulo !== 'string' || corpo.titulo.trim() === '') {
      erros.push('titulo precisa ser um texto nao vazio.');
    } else {
      dados.titulo = corpo.titulo.trim();
    }
  } else if (!parcial) {
    erros.push('titulo e obrigatorio.');
  }

  // inicio
  if (corpo.inicio !== undefined) {
    if (!ehDataValida(corpo.inicio)) {
      erros.push('inicio precisa ser uma data ISO 8601, ex: "2026-09-05T14:00:00-03:00".');
    } else {
      dados.inicio = new Date(corpo.inicio).toISOString();
    }
  } else if (!parcial) {
    erros.push('inicio e obrigatorio.');
  }

  // fim (opcional, mas se vier tem que ser valido e depois do inicio)
  if (corpo.fim !== undefined && corpo.fim !== null) {
    if (!ehDataValida(corpo.fim)) {
      erros.push('fim precisa ser uma data ISO 8601 ou null.');
    } else {
      dados.fim = new Date(corpo.fim).toISOString();
    }
  } else if (corpo.fim === null) {
    dados.fim = null;
  }

  if (dados.inicio && dados.fim && new Date(dados.fim) <= new Date(dados.inicio)) {
    erros.push('fim precisa ser depois de inicio.');
  }

  // textos opcionais
  for (const campo of ['descricao', 'local', 'categoria']) {
    if (corpo[campo] === undefined) continue;
    if (corpo[campo] === null) {
      dados[campo] = null;
    } else if (typeof corpo[campo] !== 'string') {
      erros.push(`${campo} precisa ser texto ou null.`);
    } else {
      dados[campo] = corpo[campo].trim();
    }
  }

  // participantes: lista de nomes
  if (corpo.participantes !== undefined) {
    if (!Array.isArray(corpo.participantes) || corpo.participantes.some((n) => typeof n !== 'string')) {
      erros.push('participantes precisa ser uma lista de textos, ex: ["Autora X", "Mediadora Y"].');
    } else {
      dados.participantes = corpo.participantes.map((n) => n.trim()).filter((n) => n !== '');
    }
  }

  // destaque
  if (corpo.destaque !== undefined) {
    if (typeof corpo.destaque !== 'boolean') {
      erros.push('destaque precisa ser true ou false.');
    } else {
      dados.destaque = corpo.destaque;
    }
  }

  if (erros.length > 0) return { erros };
  if (parcial && Object.keys(dados).length === 0) {
    return { erros: ['Envie ao menos um campo para atualizar.'] };
  }
  return { dados };
}

// ---------------------------------------------------------------------------
// App "Proximo Capitulo" (Bienal 2026)
// ---------------------------------------------------------------------------

const TERRITORIOS = ['aprender', 'evoluir', 'imaginar'];

// Eventos de analytics que o front pode registrar (secao 14 do rascunho do app).
const EVENTOS_METRICA = [
  'quiz_started',
  'quiz_completed',
  'territory_result',
  'skeeler_story_viewed',
  'book_clicked',
  'careers_clicked',
  'talent_pool_clicked',
  'talent_pool_completed',
  'experience_completed',
  'token_redeemed',
];

function corpoEhObjeto(corpo) {
  return corpo !== null && typeof corpo === 'object' && !Array.isArray(corpo);
}

function validarHistoria(corpo, { parcial = false } = {}) {
  const erros = [];
  const dados = {};

  if (!corpoEhObjeto(corpo)) {
    return { erros: ['O corpo da requisicao precisa ser um objeto JSON.'] };
  }

  const campos = ['territorio', 'livro', 'livro_url', 'citacao', 'skeeler_nome', 'skeeler_cargo', 'resumo', 'trajetoria', 'ordem', 'ativo'];
  const desconhecidos = Object.keys(corpo).filter((campo) => !campos.includes(campo));
  if (desconhecidos.length > 0) {
    erros.push(`Campos nao reconhecidos: ${desconhecidos.join(', ')}.`);
  }

  // territorio
  if (corpo.territorio !== undefined) {
    if (!TERRITORIOS.includes(corpo.territorio)) {
      erros.push(`territorio precisa ser um de: ${TERRITORIOS.join(', ')}.`);
    } else {
      dados.territorio = corpo.territorio;
    }
  } else if (!parcial) {
    erros.push('territorio e obrigatorio.');
  }

  // textos obrigatorios
  for (const campo of ['livro', 'citacao', 'skeeler_nome', 'skeeler_cargo']) {
    if (corpo[campo] !== undefined) {
      if (typeof corpo[campo] !== 'string' || corpo[campo].trim() === '') {
        erros.push(`${campo} precisa ser um texto nao vazio.`);
      } else {
        dados[campo] = corpo[campo].trim();
      }
    } else if (!parcial) {
      erros.push(`${campo} e obrigatorio.`);
    }
  }

  // textos opcionais
  for (const campo of ['livro_url', 'resumo']) {
    if (corpo[campo] === undefined) continue;
    if (corpo[campo] === null) {
      dados[campo] = null;
    } else if (typeof corpo[campo] !== 'string') {
      erros.push(`${campo} precisa ser texto ou null.`);
    } else {
      dados[campo] = corpo[campo].trim() || null;
    }
  }

  // trajetoria: lista de marcos { quando, marco }
  if (corpo.trajetoria !== undefined) {
    const lista = corpo.trajetoria;
    const marcoValido = (m) =>
      corpoEhObjeto(m) &&
      typeof m.quando === 'string' && m.quando.trim() !== '' &&
      typeof m.marco === 'string' && m.marco.trim() !== '' &&
      Object.keys(m).every((k) => ['quando', 'marco'].includes(k));
    if (!Array.isArray(lista) || !lista.every(marcoValido)) {
      erros.push('trajetoria precisa ser uma lista de marcos, ex: [{"quando": "2022", "marco": "Entrou como Software Engineer"}].');
    } else {
      dados.trajetoria = JSON.stringify(lista.map((m) => ({ quando: m.quando.trim(), marco: m.marco.trim() })));
    }
  }

  // ordem
  if (corpo.ordem !== undefined) {
    if (!Number.isInteger(corpo.ordem)) {
      erros.push('ordem precisa ser um numero inteiro.');
    } else {
      dados.ordem = corpo.ordem;
    }
  }

  // ativo
  if (corpo.ativo !== undefined) {
    if (typeof corpo.ativo !== 'boolean') {
      erros.push('ativo precisa ser true ou false.');
    } else {
      dados.ativo = corpo.ativo;
    }
  }

  if (erros.length > 0) return { erros };
  if (parcial && Object.keys(dados).length === 0) {
    return { erros: ['Envie ao menos um campo para atualizar.'] };
  }
  return { dados };
}

function validarTalento(corpo) {
  const erros = [];
  const dados = {};

  if (!corpoEhObjeto(corpo)) {
    return { erros: ['O corpo da requisicao precisa ser um objeto JSON.'] };
  }

  const campos = ['nome', 'email', 'telefone', 'area_interesse', 'linkedin', 'mensagem', 'territorio', 'consentimento'];
  const desconhecidos = Object.keys(corpo).filter((campo) => !campos.includes(campo));
  if (desconhecidos.length > 0) {
    erros.push(`Campos nao reconhecidos: ${desconhecidos.join(', ')}.`);
  }

  if (typeof corpo.nome !== 'string' || corpo.nome.trim() === '') {
    erros.push('nome e obrigatorio.');
  } else {
    dados.nome = corpo.nome.trim();
  }

  // Validacao leve de e-mail: so garante o formato geral algo@dominio.
  if (typeof corpo.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(corpo.email.trim())) {
    erros.push('email e obrigatorio e precisa ser valido.');
  } else {
    dados.email = corpo.email.trim().toLowerCase();
  }

  // A entrada na Estante de Talentos so vale com consentimento explicito (LGPD).
  if (corpo.consentimento !== true) {
    erros.push('consentimento precisa ser true para entrar na Estante de Talentos.');
  } else {
    dados.consentimento = true;
  }

  for (const campo of ['telefone', 'area_interesse', 'linkedin', 'mensagem']) {
    if (corpo[campo] === undefined || corpo[campo] === null) {
      dados[campo] = null;
    } else if (typeof corpo[campo] !== 'string') {
      erros.push(`${campo} precisa ser texto.`);
    } else {
      dados[campo] = corpo[campo].trim() || null;
    }
  }

  if (corpo.territorio === undefined || corpo.territorio === null) {
    dados.territorio = null;
  } else if (!TERRITORIOS.includes(corpo.territorio)) {
    erros.push(`territorio precisa ser um de: ${TERRITORIOS.join(', ')}.`);
  } else {
    dados.territorio = corpo.territorio;
  }

  if (erros.length > 0) return { erros };
  return { dados };
}

function validarMetrica(corpo) {
  const erros = [];
  const dados = {};

  if (!corpoEhObjeto(corpo)) {
    return { erros: ['O corpo da requisicao precisa ser um objeto JSON.'] };
  }

  if (!EVENTOS_METRICA.includes(corpo.evento)) {
    erros.push(`evento precisa ser um de: ${EVENTOS_METRICA.join(', ')}.`);
  } else {
    dados.evento = corpo.evento;
  }

  if (corpo.territorio === undefined || corpo.territorio === null) {
    dados.territorio = null;
  } else if (!TERRITORIOS.includes(corpo.territorio)) {
    erros.push(`territorio precisa ser um de: ${TERRITORIOS.join(', ')}.`);
  } else {
    dados.territorio = corpo.territorio;
  }

  if (corpo.historia_id === undefined || corpo.historia_id === null) {
    dados.historia_id = null;
  } else if (!Number.isInteger(corpo.historia_id) || corpo.historia_id < 1) {
    erros.push('historia_id precisa ser um numero inteiro positivo.');
  } else {
    dados.historia_id = corpo.historia_id;
  }

  if (corpo.sessao === undefined || corpo.sessao === null) {
    dados.sessao = null;
  } else if (typeof corpo.sessao !== 'string' || corpo.sessao.length > 100) {
    erros.push('sessao precisa ser um texto de ate 100 caracteres.');
  } else {
    dados.sessao = corpo.sessao;
  }

  if (erros.length > 0) return { erros };
  return { dados };
}

module.exports = { validarEvento, validarHistoria, validarTalento, validarMetrica, TERRITORIOS, EVENTOS_METRICA };
