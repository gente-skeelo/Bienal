// Painel de gestao do app "Proximo Capitulo".
// Tudo que o painel escreve passa pela API; com CHAVE_ADMIN definida no
// servidor, a chave e pedida uma vez e guardada neste navegador.

const $ = (id) => document.getElementById(id);

const TERRITORIOS = { aprender: 'Aprender', evoluir: 'Evoluir', imaginar: 'Imaginar' };

// ---------------------------------------------------------------------------
// Chave de acesso + chamadas a API
// ---------------------------------------------------------------------------

function chaveSalva() {
  try { return localStorage.getItem('bienal_chave_admin') || ''; } catch { return ''; }
}

function salvarChave(chave) {
  try { localStorage.setItem('bienal_chave_admin', chave); } catch {}
}

async function api(caminho, opcoes = {}) {
  const cabecalhos = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
  const chave = chaveSalva();
  if (chave) cabecalhos.Authorization = `Bearer ${chave}`;

  const resposta = await fetch(caminho, { ...opcoes, headers: cabecalhos });
  if (resposta.status === 401) {
    $('aviso-chave').hidden = false;
    throw new Error('Chave de acesso necessária.');
  }
  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const mensagem = corpo && (corpo.erro || (corpo.erros && corpo.erros.join(' ')));
    throw new Error(mensagem || `Erro ${resposta.status}.`);
  }
  return corpo;
}

$('btn-salvar-chave').addEventListener('click', () => {
  salvarChave($('campo-chave').value.trim());
  $('aviso-chave').hidden = true;
  mostrarSecao(secaoAtual); // recarrega a secao que falhou
});

$('btn-trocar-chave').addEventListener('click', () => {
  salvarChave('');
  $('campo-chave').value = '';
  $('aviso-chave').hidden = false;
});

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

let secaoAtual = 'historias';

const CARREGADORES = {
  historias: carregarHistorias,
  talentos: carregarTalentos,
  metricas: carregarMetricas,
  qrcode: carregarQrcode,
  config: carregarConfig,
};

function mostrarSecao(nome) {
  secaoAtual = nome;
  document.querySelectorAll('.secao').forEach((secao) => {
    secao.hidden = secao.id !== `secao-${nome}`;
  });
  document.querySelectorAll('.menu-item').forEach((item) => {
    item.classList.toggle('ativo', item.dataset.secao === nome);
  });
  CARREGADORES[nome]().catch(() => {});
}

$('menu').addEventListener('click', (evento) => {
  const item = evento.target.closest('.menu-item');
  if (item) mostrarSecao(item.dataset.secao);
});

// ---------------------------------------------------------------------------
// Historias (Estantes dos Skeelers)
// ---------------------------------------------------------------------------

let historias = [];
let historiaEditando = null; // null = criando

async function carregarHistorias() {
  const lista = $('lista-historias');
  lista.textContent = 'Carregando...';
  const corpo = await api('/api/historias?todas=true');
  historias = corpo.historias;
  renderizarHistorias();
}

function renderizarHistorias() {
  const filtro = $('filtro-territorio').value;
  const lista = $('lista-historias');
  lista.innerHTML = '';

  const visiveis = historias.filter((h) => !filtro || h.territorio === filtro);
  if (visiveis.length === 0) {
    lista.textContent = 'Nenhuma história por aqui ainda. Crie a primeira com “+ Nova história”.';
    return;
  }

  for (const historia of visiveis) {
    const cartao = document.createElement('article');
    cartao.className = 'cartao' + (historia.ativo ? '' : ' inativa');

    const topo = document.createElement('div');
    topo.className = 'cartao-topo';
    const etiqueta = document.createElement('span');
    etiqueta.className = `etiqueta ${historia.territorio}`;
    etiqueta.textContent = TERRITORIOS[historia.territorio];
    topo.appendChild(etiqueta);
    if (!historia.ativo) {
      const inativa = document.createElement('span');
      inativa.className = 'etiqueta cinza';
      inativa.textContent = 'Inativa';
      topo.appendChild(inativa);
    }
    const livro = document.createElement('span');
    livro.className = 'cartao-livro';
    livro.textContent = `📚 ${historia.livro}`;
    topo.appendChild(livro);
    if (historia.foto) {
      const foto = document.createElement('img');
      foto.className = 'cartao-foto';
      foto.src = historia.foto;
      foto.alt = '';
      topo.appendChild(foto);
    }
    cartao.appendChild(topo);

    const skeeler = document.createElement('p');
    skeeler.className = 'cartao-detalhe';
    skeeler.textContent = `${historia.skeeler_nome} · ${historia.skeeler_cargo}` + (historia.resumo ? ` — ${historia.resumo}` : '');
    cartao.appendChild(skeeler);

    const citacao = document.createElement('p');
    citacao.className = 'cartao-detalhe';
    citacao.textContent = `“${historia.citacao}”`;
    cartao.appendChild(citacao);

    if (historia.indicacao) {
      const indicacao = document.createElement('p');
      indicacao.className = 'cartao-detalhe';
      indicacao.textContent = `Indicação do Skeelo: ${historia.indicacao}`;
      cartao.appendChild(indicacao);
    }

    const acoes = document.createElement('div');
    acoes.className = 'cartao-acoes';

    const editar = document.createElement('button');
    editar.className = 'botao secundario mini';
    editar.textContent = 'Editar';
    editar.addEventListener('click', () => abrirFormHistoria(historia));

    const alternar = document.createElement('button');
    alternar.className = 'botao secundario mini';
    alternar.textContent = historia.ativo ? 'Desativar' : 'Ativar';
    alternar.addEventListener('click', async () => {
      await api(`/api/historias/${historia.id}`, { method: 'PATCH', body: JSON.stringify({ ativo: !historia.ativo }) });
      carregarHistorias();
    });

    const excluir = document.createElement('button');
    excluir.className = 'botao perigo mini';
    excluir.textContent = 'Excluir';
    excluir.addEventListener('click', async () => {
      if (!confirm(`Excluir a história de ${historia.skeeler_nome} (${historia.livro})? Para tirar do app sem apagar, use "Desativar".`)) return;
      await api(`/api/historias/${historia.id}`, { method: 'DELETE' });
      carregarHistorias();
    });

    acoes.append(editar, alternar, excluir);
    cartao.appendChild(acoes);
    lista.appendChild(cartao);
  }
}

$('filtro-territorio').addEventListener('change', renderizarHistorias);

function linhaMarco(quando = '', marco = '') {
  const linha = document.createElement('div');
  linha.className = 'marco-linha';

  const campoQuando = document.createElement('input');
  campoQuando.placeholder = 'Ex.: 2022';
  campoQuando.value = quando;
  campoQuando.dataset.campo = 'quando';

  const campoMarco = document.createElement('input');
  campoMarco.placeholder = 'Ex.: Entrou como Software Engineer';
  campoMarco.value = marco;
  campoMarco.dataset.campo = 'marco';

  const remover = document.createElement('button');
  remover.type = 'button';
  remover.className = 'botao perigo mini';
  remover.textContent = '×';
  remover.addEventListener('click', () => linha.remove());

  linha.append(campoQuando, campoMarco, remover);
  return linha;
}

$('btn-add-marco').addEventListener('click', () => $('marcos').appendChild(linhaMarco()));

// Foto: `undefined` = nao mexeu (o PATCH nao envia o campo e a foto atual fica);
// string = foto nova; null = pediu para remover.
let fotoEscolhida;

function mostrarPreviaFoto(dataUrl) {
  const previa = $('foto-previa');
  previa.hidden = !dataUrl;
  previa.src = dataUrl || '';
  $('btn-remover-foto').hidden = !dataUrl;
}

// Recorta em quadrado (centro) e reduz para 320px em JPEG: a foto vai em
// base64 dentro do JSON da historia, entao precisa nascer pequena.
function reduzirFoto(arquivo) {
  return new Promise((resolver, rejeitar) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      const LADO = 320;
      const corte = Math.min(imagem.naturalWidth, imagem.naturalHeight);
      const sx = (imagem.naturalWidth - corte) / 2;
      const sy = (imagem.naturalHeight - corte) / 2;
      const tela = document.createElement('canvas');
      tela.width = LADO;
      tela.height = LADO;
      tela.getContext('2d').drawImage(imagem, sx, sy, corte, corte, 0, 0, LADO, LADO);
      resolver(tela.toDataURL('image/jpeg', 0.82));
    };
    imagem.onerror = () => { URL.revokeObjectURL(url); rejeitar(new Error('Não consegui ler essa imagem.')); };
    imagem.src = url;
  });
}

$('form-historia').foto_arquivo.addEventListener('change', async (evento) => {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;
  try {
    fotoEscolhida = await reduzirFoto(arquivo);
    mostrarPreviaFoto(fotoEscolhida);
  } catch (e) {
    $('form-historia-erro').textContent = e.message;
    $('form-historia-erro').hidden = false;
  }
});

$('btn-remover-foto').addEventListener('click', () => {
  fotoEscolhida = null;
  $('form-historia').foto_arquivo.value = '';
  mostrarPreviaFoto(null);
});

function abrirFormHistoria(historia = null) {
  historiaEditando = historia;
  fotoEscolhida = undefined;
  const form = $('form-historia');
  form.foto_arquivo.value = '';
  mostrarPreviaFoto(historia && historia.foto);
  $('form-historia-titulo').textContent = historia ? `Editando: ${historia.livro}` : 'Nova história';
  $('form-historia-erro').hidden = true;

  form.territorio.value = historia ? historia.territorio : ($('filtro-territorio').value || 'aprender');
  form.ordem.value = historia ? historia.ordem : 0;
  form.livro.value = historia ? historia.livro : '';
  form.livro_url.value = (historia && historia.livro_url) || '';
  form.citacao.value = historia ? historia.citacao : '';
  form.indicacao.value = (historia && historia.indicacao) || '';
  form.skeeler_nome.value = historia ? historia.skeeler_nome : '';
  form.skeeler_cargo.value = historia ? historia.skeeler_cargo : '';
  form.resumo.value = (historia && historia.resumo) || '';
  form.ativo.checked = historia ? historia.ativo : true;

  const marcos = $('marcos');
  marcos.innerHTML = '';
  const trajetoria = (historia && historia.trajetoria) || [];
  for (const marco of trajetoria) marcos.appendChild(linhaMarco(marco.quando, marco.marco));
  if (trajetoria.length === 0) marcos.appendChild(linhaMarco());

  form.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('btn-nova-historia').addEventListener('click', () => abrirFormHistoria());
$('btn-cancelar-historia').addEventListener('click', () => { $('form-historia').hidden = true; });

$('form-historia').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const form = evento.target;
  const erro = $('form-historia-erro');
  erro.hidden = true;

  const trajetoria = [...$('marcos').querySelectorAll('.marco-linha')]
    .map((linha) => ({
      quando: linha.querySelector('[data-campo=quando]').value.trim(),
      marco: linha.querySelector('[data-campo=marco]').value.trim(),
    }))
    .filter((m) => m.quando !== '' || m.marco !== '');

  if (trajetoria.some((m) => m.quando === '' || m.marco === '')) {
    erro.textContent = 'Cada marco da trajetória precisa de "quando" e "o que aconteceu" (ou remova a linha).';
    erro.hidden = false;
    return;
  }

  const dados = {
    territorio: form.territorio.value,
    livro: form.livro.value.trim(),
    livro_url: form.livro_url.value.trim() || null,
    citacao: form.citacao.value.trim(),
    indicacao: form.indicacao.value.trim() || null,
    skeeler_nome: form.skeeler_nome.value.trim(),
    skeeler_cargo: form.skeeler_cargo.value.trim(),
    resumo: form.resumo.value.trim() || null,
    trajetoria,
    ordem: parseInt(form.ordem.value, 10) || 0,
    ativo: form.ativo.checked,
  };
  if (fotoEscolhida !== undefined) dados.foto = fotoEscolhida;

  try {
    if (historiaEditando) {
      await api(`/api/historias/${historiaEditando.id}`, { method: 'PATCH', body: JSON.stringify(dados) });
    } else {
      await api('/api/historias', { method: 'POST', body: JSON.stringify(dados) });
    }
    form.hidden = true;
    carregarHistorias();
  } catch (e) {
    erro.textContent = e.message;
    erro.hidden = false;
  }
});

// ---------------------------------------------------------------------------
// Talentos
// ---------------------------------------------------------------------------

let talentos = [];

async function carregarTalentos() {
  const corpoTabela = $('tabela-talentos').querySelector('tbody');
  corpoTabela.innerHTML = '';
  $('talentos-total').textContent = 'Carregando...';

  const corpo = await api('/api/talentos');
  talentos = corpo.talentos;
  $('talentos-total').textContent = `${corpo.total} pessoa(s) na Estante de Talentos`;

  for (const talento of talentos) {
    const linha = document.createElement('tr');
    const celulas = [
      talento.nome,
      talento.email,
      talento.telefone || '—',
      talento.area_interesse || '—',
      talento.territorio ? TERRITORIOS[talento.territorio] : '—',
      talento.maioridade ? 'sim' : '—',
    ];
    for (const texto of celulas) {
      const celula = document.createElement('td');
      celula.textContent = texto;
      linha.appendChild(celula);
    }

    const celulaLink = document.createElement('td');
    if (talento.linkedin) {
      const link = document.createElement('a');
      link.href = talento.linkedin;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'abrir';
      celulaLink.appendChild(link);
    } else {
      celulaLink.textContent = '—';
    }
    linha.appendChild(celulaLink);

    const celulaMensagem = document.createElement('td');
    celulaMensagem.textContent = talento.mensagem || '—';
    linha.appendChild(celulaMensagem);

    const celulaData = document.createElement('td');
    celulaData.textContent = new Date(talento.criado_em).toLocaleDateString('pt-BR');
    linha.appendChild(celulaData);

    corpoTabela.appendChild(linha);
  }
}

$('btn-csv-talentos').addEventListener('click', () => {
  const cabecalho = ['nome', 'email', 'telefone', 'area_interesse', 'territorio', 'linkedin', 'mensagem', 'maioridade', 'consentimento', 'criado_em'];
  const escapar = (valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`;
  const linhas = [cabecalho.join(';'), ...talentos.map((t) => cabecalho.map((c) => escapar(t[c])).join(';'))];
  const blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'estante-de-talentos.csv';
  link.click();
  URL.revokeObjectURL(link.href);
});

// ---------------------------------------------------------------------------
// Metricas
// ---------------------------------------------------------------------------

// Ordem do funil da experiencia (secao 14 do rascunho).
const FUNIL = [
  ['quiz_started', 'Começaram o quiz'],
  ['quiz_completed', 'Concluíram o quiz'],
  ['territory_result', 'Receberam território'],
  ['skeeler_story_viewed', 'Abriram uma história'],
  ['book_clicked', 'Clicaram em um livro'],
  ['careers_clicked', 'Abriram oportunidades'],
  ['talent_pool_clicked', 'Abriram a Estante de Talentos'],
  ['talent_pool_completed', 'Entraram na Estante de Talentos'],
  ['experience_completed', 'Concluíram a experiência'],
  ['token_redeemed', 'Resgataram token'],
];

function barra(nome, valor, maximo) {
  const linha = document.createElement('div');
  linha.className = 'funil-linha';

  const rotulo = document.createElement('span');
  rotulo.className = 'funil-nome';
  rotulo.textContent = nome;
  rotulo.title = nome;

  const trilho = document.createElement('div');
  trilho.className = 'funil-trilho';
  const preenchimento = document.createElement('div');
  preenchimento.className = 'funil-barra';
  preenchimento.style.width = maximo > 0 ? `${(valor / maximo) * 100}%` : '0';
  trilho.appendChild(preenchimento);

  const numero = document.createElement('span');
  numero.className = 'funil-valor';
  numero.textContent = valor;

  linha.append(rotulo, trilho, numero);
  return linha;
}

async function carregarMetricas() {
  const resumo = await api('/api/metricas/resumo');

  const porEvento = Object.fromEntries(resumo.por_evento.map((e) => [e.evento, e]));
  const maximoFunil = Math.max(1, ...resumo.por_evento.map((e) => e.sessoes));
  const funil = $('funil');
  funil.innerHTML = '';
  for (const [evento, nome] of FUNIL) {
    funil.appendChild(barra(nome, porEvento[evento] ? porEvento[evento].sessoes : 0, maximoFunil));
  }

  const territorios = $('metricas-territorios');
  territorios.innerHTML = '';
  const maximoTerritorios = Math.max(1, ...resumo.territorios.map((t) => t.total));
  for (const territorio of resumo.territorios) {
    territorios.appendChild(barra(TERRITORIOS[territorio.territorio] || territorio.territorio, territorio.total, maximoTerritorios));
  }
  if (resumo.territorios.length === 0) territorios.textContent = 'Nenhum resultado de quiz ainda.';

  const maisVistas = $('metricas-historias');
  maisVistas.innerHTML = '';
  for (const historia of resumo.historias_mais_vistas) {
    const cartao = document.createElement('div');
    cartao.className = 'cartao';
    const texto = document.createElement('p');
    texto.textContent = `📚 ${historia.livro || `história #${historia.historia_id}`} — ${historia.skeeler_nome || ''} · ${historia.visualizacoes} visualização(ões)`;
    cartao.appendChild(texto);
    maisVistas.appendChild(cartao);
  }
  if (resumo.historias_mais_vistas.length === 0) maisVistas.textContent = 'Nenhuma história aberta ainda.';
}

$('btn-atualizar-metricas').addEventListener('click', () => carregarMetricas().catch(() => {}));

// ---------------------------------------------------------------------------
// Configuracoes
// ---------------------------------------------------------------------------

async function carregarConfig() {
  const config = await api('/api/config');
  $('form-config').url_oportunidades.value = config.url_oportunidades || '';
}

$('form-config').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const form = evento.target;
  const erro = $('form-config-erro');
  erro.hidden = true;
  try {
    await api('/api/config', {
      method: 'PATCH',
      body: JSON.stringify({ url_oportunidades: form.url_oportunidades.value.trim() }),
    });
    erro.textContent = 'Salvo! O app já usa o novo link.';
    erro.style.color = 'var(--acento)';
    erro.hidden = false;
  } catch (e) {
    erro.textContent = e.message;
    erro.style.color = '';
    erro.hidden = false;
  }
});

// ---------------------------------------------------------------------------
// QR Code do estande
// ---------------------------------------------------------------------------
// O codigo e gerado aqui, no navegador (lib vendorizada em vendor/qrcode.js).
// Nada de encurtador ou gerador online: um QR impresso vive semanas e nao pode
// depender de um servico de terceiros que sai do ar, passa a cobrar ou expira.

// 'Q' corrige ate 25% do codigo danificado - no estande o cartaz amassa, pega
// reflexo e e lido de longe. Para uma URL deste tamanho o nivel Q cabe na mesma
// grade que o 'M', entao a robustez sai de graca.
const QR_CORRECAO = 'Q';
// Zona de silencio: a especificacao pede 4 modulos de margem clara em volta.
// Sem ela, muito leitor simplesmente nao enxerga o codigo.
const QR_MARGEM = 4;

let qrAtual = null; // { url, tamanho, modulos: boolean[][] }

function urlPadraoDoApp() {
  return new URL('/app/', location.href).href;
}

function calcularQr(url) {
  const codigo = qrcode(0, QR_CORRECAO); // 0 = escolhe a menor versao que couber
  codigo.addData(url);
  codigo.make();
  const tamanho = codigo.getModuleCount();
  const modulos = [];
  for (let linha = 0; linha < tamanho; linha += 1) {
    const celulas = [];
    for (let coluna = 0; coluna < tamanho; coluna += 1) celulas.push(codigo.isDark(linha, coluna));
    modulos.push(celulas);
  }
  return { url, tamanho, modulos };
}

// Um unico <path> com um quadrado por modulo escuro: arquivo pequeno e sem
// costura entre os modulos (emenda vira borrao na impressao).
function caminhoDoQr(qr) {
  const partes = [];
  for (let linha = 0; linha < qr.tamanho; linha += 1) {
    for (let coluna = 0; coluna < qr.tamanho; coluna += 1) {
      if (qr.modulos[linha][coluna]) {
        partes.push(`M${coluna + QR_MARGEM} ${linha + QR_MARGEM}h1v1h-1z`);
      }
    }
  }
  return partes.join('');
}

// Na tela o SVG ocupa o espaco que recebe (100%); no arquivo baixado ele leva
// um tamanho fisico em milimetros, para chegar na grafica ja com escala - e com
// o viewBox intacto, entao continua ampliavel para banner sem perder nitidez.
function svgDoQr(qr, { paraArquivo = false } = {}) {
  const lado = qr.tamanho + QR_MARGEM * 2;
  const medida = paraArquivo ? 'width="80mm" height="80mm"' : 'width="100%" height="100%"';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}"`,
    ` ${medida} shape-rendering="crispEdges" role="img"`,
    ` aria-label="QR Code para ${qr.url}">`,
    `<rect width="${lado}" height="${lado}" fill="#ffffff"/>`,
    `<path d="${caminhoDoQr(qr)}" fill="#03150f"/>`,
    '</svg>',
  ].join('');
}

function baixarArquivo(nome, blob) {
  const endereco = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = endereco;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(endereco);
}

function mostrarQr() {
  const erro = $('qr-erro');
  const url = $('qr-url').value.trim();
  erro.hidden = true;
  erro.classList.remove('aviso');

  if (!url) {
    qrAtual = null;
    $('qr-quadro').innerHTML = '';
    $('cartaz-qr').innerHTML = '';
    $('cartaz-url').textContent = '';
    erro.textContent = 'Informe a URL do app.';
    erro.hidden = false;
    return;
  }

  try {
    qrAtual = calcularQr(url);
  } catch (e) {
    qrAtual = null;
    $('qr-quadro').innerHTML = '';
    $('cartaz-qr').innerHTML = '';
    erro.textContent = 'Nao foi possivel gerar o codigo para esta URL.';
    erro.hidden = false;
    return;
  }

  const svg = svgDoQr(qrAtual);
  $('qr-quadro').innerHTML = svg;
  $('cartaz-qr').innerHTML = svg;
  // No cartaz a URL aparece sem o "https://": quem digita no lugar de escanear
  // nao precisa do protocolo, e a linha fica mais curta e legivel de longe.
  $('cartaz-url').textContent = url.replace(/^https?:\/\//, '');

  // Um QR impresso apontando para localhost e o erro classico da vespera do
  // evento: avisa antes de alguem mandar para a grafica.
  const hospedeiro = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hospedeiro) || hospedeiro.endsWith('.local')) {
    erro.textContent = 'Atencao: esta e uma URL local, que so abre neste computador. Troque pela URL publica antes de imprimir.';
    erro.classList.add('aviso');
    erro.hidden = false;
  }
}

async function carregarQrcode() {
  if (!$('qr-url').value.trim()) $('qr-url').value = urlPadraoDoApp();
  mostrarQr();
}

$('qr-url').addEventListener('input', mostrarQr);

$('btn-qr-padrao').addEventListener('click', () => {
  $('qr-url').value = urlPadraoDoApp();
  mostrarQr();
});

$('btn-qr-svg').addEventListener('click', () => {
  if (!qrAtual) return;
  const conteudo = `<?xml version="1.0" encoding="UTF-8"?>\n${svgDoQr(qrAtual, { paraArquivo: true })}`;
  baixarArquivo('qrcode-proximo-capitulo.svg', new Blob([conteudo], { type: 'image/svg+xml' }));
});

$('btn-qr-png').addEventListener('click', () => {
  if (!qrAtual) return;
  const lado = qrAtual.tamanho + QR_MARGEM * 2;
  // Modulo inteiro em pixels: modulo quebrado vira borda cinza e leitor ruim.
  const escala = Math.max(1, Math.floor(1600 / lado));
  const tela = document.createElement('canvas');
  tela.width = lado * escala;
  tela.height = lado * escala;
  const pincel = tela.getContext('2d');
  pincel.fillStyle = '#ffffff';
  pincel.fillRect(0, 0, tela.width, tela.height);
  pincel.fillStyle = '#03150f';
  for (let linha = 0; linha < qrAtual.tamanho; linha += 1) {
    for (let coluna = 0; coluna < qrAtual.tamanho; coluna += 1) {
      if (qrAtual.modulos[linha][coluna]) {
        pincel.fillRect((coluna + QR_MARGEM) * escala, (linha + QR_MARGEM) * escala, escala, escala);
      }
    }
  }
  tela.toBlob((blob) => baixarArquivo('qrcode-proximo-capitulo.png', blob), 'image/png');
});

$('btn-qr-imprimir').addEventListener('click', () => {
  if (!qrAtual) return;
  window.print();
});

// ---------------------------------------------------------------------------

mostrarSecao('historias');
