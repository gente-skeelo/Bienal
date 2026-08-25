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

module.exports = { validarEvento };
