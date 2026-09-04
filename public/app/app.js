// App "Proximo Capitulo" — Bienal 2026.
// Quiz de 7 perguntas -> territorio (Aprender, Evoluir, Imaginar) -> Estante dos
// Skeelers -> trajetorias reais -> Employer Branding -> Estante de Talentos -> Urna.
// Sem login no quiz; o cadastro na Estante de Talentos e obrigatorio para
// concluir e ganhar o brinde (decisao de 28/08). O voucher do livro nao sai na
// hora: e enviado depois por e-mail, como acao de CRM.

// Link da pagina de vagas do Skeelo, ajustavel pelo painel /admin
// (Configuracoes). Vazio = o botao de oportunidades nao aparece (evita link
// quebrado no estande).
let URL_OPORTUNIDADES = '';
fetch('/api/config')
  .then((resposta) => resposta.json())
  .then((config) => {
    URL_OPORTUNIDADES = config.url_oportunidades || '';
  })
  .catch(() => {});

const TERRITORIOS = {
  aprender: {
    nome: 'Aprender',
    titulo: 'Um capítulo sobre ampliar repertório.',
    texto:
      'Você está em um momento de descobrir, desenvolver ou dominar coisas novas. ' +
      'Talvez esteja buscando uma nova habilidade, querendo se aprofundar no que faz ' +
      'ou se preparando para desafios que pedem um repertório diferente.',
    mensagem: 'Às vezes, o próximo capítulo começa aprendendo algo que você ainda não sabe.',
    estante: 'Histórias que ajudaram Skeelers a ampliar seu repertório.',
  },
  evoluir: {
    nome: 'Evoluir',
    titulo: 'Um capítulo sobre transformar.',
    texto:
      'Você parece estar em um momento de movimento: assumir novos desafios, ampliar ' +
      'responsabilidades ou transformar alguma coisa na forma como constrói sua carreira.',
    mensagem: 'Algumas histórias acompanham a mudança. Outras ajudam a fazê-la acontecer.',
    estante: 'Histórias que acompanharam Skeelers em momentos de transformação.',
  },
  imaginar: {
    nome: 'Imaginar',
    titulo: 'Um capítulo sobre enxergar novas possibilidades.',
    texto:
      'Você parece estar em um momento de questionar o que vem depois e imaginar caminhos ' +
      'que ainda não estão totalmente desenhados. Pode ser uma nova área, um desafio ' +
      'diferente, mais impacto ou simplesmente aquela pergunta: “E se?”',
    mensagem: 'Todo próximo capítulo começa antes de existir — quando alguém consegue imaginá-lo.',
    estante: 'Histórias que ajudaram Skeelers a enxergar novos caminhos.',
  },
};

// 7 perguntas, 1 por tela, cada resposta soma +1 para um territorio.
const PERGUNTAS = [
  {
    pergunta: 'Pensando na sua carreira hoje, o que mais parece fazer falta para o próximo passo?',
    alternativas: [
      { texto: 'Aprender algo que ainda não domino.', territorio: 'aprender' },
      { texto: 'Me desafiar e crescer a partir do que já construí.', territorio: 'evoluir' },
      { texto: 'Enxergar possibilidades que ainda não considerei.', territorio: 'imaginar' },
    ],
  },
  {
    pergunta: 'Qual dessas frases mais combina com seu momento?',
    alternativas: [
      { texto: 'Quero ampliar meu repertório.', territorio: 'aprender' },
      { texto: 'Sinto que estou pronto para um próximo passo.', territorio: 'evoluir' },
      { texto: 'Estou tentando descobrir qual pode ser esse próximo passo.', territorio: 'imaginar' },
    ],
  },
  {
    pergunta: 'Se sua carreira fosse uma história, qual capítulo você gostaria de começar agora?',
    alternativas: [
      { texto: 'Descobrindo algo novo.', territorio: 'aprender' },
      { texto: 'Indo além do que eu fazia antes.', territorio: 'evoluir' },
      { texto: 'Explorando um caminho diferente.', territorio: 'imaginar' },
    ],
  },
  {
    pergunta: 'O que mais te atrai em um novo desafio?',
    alternativas: [
      { texto: 'Dominar uma habilidade que admiro em outras pessoas.', territorio: 'aprender' },
      { texto: 'Assumir mais responsabilidade pelo resultado.', territorio: 'evoluir' },
      { texto: 'Testar uma ideia que ainda não vi ninguém fazer.', territorio: 'imaginar' },
    ],
  },
  {
    pergunta: 'Quando você pensa nos próximos dois anos, o que vem primeiro à cabeça?',
    alternativas: [
      { texto: 'Tudo o que ainda quero aprender.', territorio: 'aprender' },
      { texto: 'O tamanho do desafio que quero assumir.', territorio: 'evoluir' },
      { texto: 'Os caminhos que ainda nem existem.', territorio: 'imaginar' },
    ],
  },
  {
    pergunta: 'Diante de um problema difícil no trabalho, qual é o seu primeiro movimento?',
    alternativas: [
      { texto: 'Estudar até entender o assunto a fundo.', territorio: 'aprender' },
      { texto: 'Encarar de frente e crescer com o processo.', territorio: 'evoluir' },
      { texto: 'Procurar um ângulo que ninguém considerou.', territorio: 'imaginar' },
    ],
  },
  {
    pergunta: 'Que história você gostaria de contar daqui a um tempo?',
    alternativas: [
      { texto: '“Aprendi algo que mudou meu jeito de trabalhar.”', territorio: 'aprender' },
      { texto: '“Me transformei diante de um grande desafio.”', territorio: 'evoluir' },
      { texto: '“Construí um caminho que ainda não existia.”', territorio: 'imaginar' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Estado e analytics
// ---------------------------------------------------------------------------

const estado = {
  sessao: novaSessao(),
  perguntaAtual: 0,
  respostas: [],
  territorio: null,
  historias: [],
  experienciaConcluida: false,
};

function novaSessao() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Analytics essenciais: registra e segue em frente. Falha de rede nao pode
// travar a experiencia no estande.
function registrar(evento, extras = {}) {
  fetch('/api/metricas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ evento, sessao: estado.sessao, ...extras }),
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Navegacao entre telas
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

function mostrar(idTela) {
  document.querySelectorAll('.tela').forEach((tela) => {
    tela.hidden = tela.id !== idTela;
  });
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

function comecarQuiz() {
  estado.perguntaAtual = 0;
  estado.respostas = [];
  registrar('quiz_started');
  renderizarPergunta();
  mostrar('tela-quiz');
}

function renderizarPergunta() {
  const indice = estado.perguntaAtual;
  const { pergunta, alternativas } = PERGUNTAS[indice];

  $('quiz-passo').textContent = `${indice + 1} de ${PERGUNTAS.length}`;
  $('quiz-progresso').style.width = `${(indice / PERGUNTAS.length) * 100}%`;
  $('quiz-pergunta').textContent = pergunta;

  const lista = $('quiz-alternativas');
  lista.innerHTML = '';
  // Embaralha a ordem para o mesmo territorio nao ficar sempre na mesma posicao.
  for (const alternativa of embaralhar(alternativas)) {
    const botao = document.createElement('button');
    botao.className = 'alternativa';
    botao.type = 'button';
    botao.textContent = alternativa.texto;
    botao.addEventListener('click', () => responder(alternativa.territorio));
    lista.appendChild(botao);
  }
}

function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function responder(territorio) {
  // Ignora toques enquanto a pagina esta virando (evita resposta dupla).
  if ($('quiz-pagina').classList.contains('virar-sai')) return;
  estado.respostas.push(territorio);
  if (estado.perguntaAtual >= PERGUNTAS.length - 1) {
    concluirQuiz();
    return;
  }
  estado.perguntaAtual += 1;

  // A pergunta atual vira como pagina de livro; a proxima assenta em seguida.
  const pagina = $('quiz-pagina');
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduzirMovimento) {
    renderizarPergunta();
    return;
  }
  pagina.classList.add('virar-sai');
  setTimeout(() => {
    renderizarPergunta();
    pagina.classList.remove('virar-sai');
    pagina.classList.add('virar-entra');
    setTimeout(() => pagina.classList.remove('virar-entra'), 300);
  }, 210);
}

function concluirQuiz() {
  estado.territorio = calcularTerritorio(estado.respostas);
  registrar('quiz_completed');
  registrar('territory_result', { territorio: estado.territorio });
  mostrar('tela-reveal');
  setTimeout(mostrarResultado, 2000);
}

// O maior resultado define o territorio. Em caso de empate, vale o territorio
// empatado que a pessoa escolheu por ultimo (o momento mais recente pesa mais).
function calcularTerritorio(respostas) {
  const pontos = { aprender: 0, evoluir: 0, imaginar: 0 };
  for (const territorio of respostas) pontos[territorio] += 1;

  const maximo = Math.max(...Object.values(pontos));
  const empatados = Object.keys(pontos).filter((t) => pontos[t] === maximo);
  if (empatados.length === 1) return empatados[0];

  for (let i = respostas.length - 1; i >= 0; i--) {
    if (empatados.includes(respostas[i])) return respostas[i];
  }
  return empatados[0];
}

// ---------------------------------------------------------------------------
// Resultado + Estante dos Skeelers
// ---------------------------------------------------------------------------

function mostrarResultado() {
  const territorio = TERRITORIOS[estado.territorio];
  document.body.dataset.territorio = estado.territorio;

  $('resultado-territorio').textContent = territorio.nome;
  $('resultado-titulo').textContent = territorio.titulo;
  $('resultado-texto').textContent = territorio.texto;
  $('resultado-mensagem').textContent = territorio.mensagem;
  mostrar('tela-resultado');
}

async function mostrarEstante() {
  const territorio = TERRITORIOS[estado.territorio];
  $('estante-territorio').textContent = territorio.nome;
  $('estante-descricao').textContent = territorio.estante;

  const lista = $('estante-lista');
  lista.innerHTML = '<p class="apoio">Abrindo a estante...</p>';
  mostrar('tela-estante');

  try {
    if (estado.historias.length === 0) {
      const resposta = await fetch(`/api/historias?territorio=${estado.territorio}`);
      const corpo = await resposta.json();
      estado.historias = corpo.historias || [];
    }
  } catch {
    estado.historias = [];
  }

  lista.innerHTML = '';
  if (estado.historias.length === 0) {
    await montarEstanteVazia(lista);
    return;
  }

  for (const historia of estado.historias) {
    lista.appendChild(montarCartao(historia));
  }
}

function montarCartao(historia) {
  const cartao = document.createElement('article');
  cartao.className = 'cartao';

  const livro = document.createElement('p');
  livro.className = 'cartao-livro';
  livro.textContent = `📚 ${historia.livro}`;

  const citacao = document.createElement('blockquote');
  citacao.className = 'cartao-citacao';
  citacao.textContent = `“${historia.citacao}”`;

  const skeeler = document.createElement('p');
  skeeler.className = 'cartao-skeeler';
  skeeler.textContent = `${historia.skeeler_nome} · ${historia.skeeler_cargo}`;

  cartao.append(livro, citacao, skeeler);

  if (historia.resumo) {
    const resumo = document.createElement('p');
    resumo.className = 'cartao-resumo';
    resumo.textContent = historia.resumo;
    cartao.appendChild(resumo);
  }

  const botao = document.createElement('button');
  botao.className = 'botao secundario';
  botao.type = 'button';
  botao.textContent = 'Conhecer essa história';
  botao.addEventListener('click', () => mostrarTrajetoria(historia));
  cartao.appendChild(botao);

  return cartao;
}

// Estante sem história publicada para o territorio: em vez de mandar o visitante
// procurar um Skeeler no estande (nao sabemos o volume de gente nem se o time da
// conta de atender um a um), oferecemos ali mesmo as historias das outras
// estantes - a historia em destaque fica sempre ao alcance de um toque.
// So mostramos o convite quando ha o que abrir: link que nao leva a nada e pior
// do que a mensagem seca.
async function montarEstanteVazia(lista) {
  const aviso = document.createElement('p');
  aviso.className = 'apoio';
  aviso.textContent = 'As histórias desta estante estão sendo escritas.';
  lista.appendChild(aviso);

  let outras = [];
  try {
    const resposta = await fetch('/api/historias');
    const corpo = await resposta.json();
    outras = (corpo.historias || []).filter((historia) => historia.territorio !== estado.territorio);
  } catch {
    outras = [];
  }

  if (outras.length === 0) {
    aviso.textContent =
      'As histórias desta estante estão sendo escritas. Volte daqui a pouco para conhecê-las.';
    return;
  }

  const convite = document.createElement('button');
  convite.type = 'button';
  convite.className = 'link-inline';
  convite.textContent = 'Veja algumas delas aqui.';
  convite.addEventListener('click', () => {
    lista.innerHTML = '';

    const nota = document.createElement('p');
    nota.className = 'apoio';
    nota.textContent = 'Enquanto esta estante é escrita, conheça histórias das outras estantes.';
    lista.appendChild(nota);

    for (const historia of outras) {
      lista.appendChild(montarCartao(historia));
    }
  });

  aviso.append(' ', convite);
}

function mostrarTrajetoria(historia) {
  registrar('skeeler_story_viewed', { territorio: estado.territorio, historia_id: historia.id });

  $('trajetoria-nome').textContent = `${historia.skeeler_nome} · ${historia.skeeler_cargo}`;
  $('trajetoria-cargo').textContent = historia.resumo || '';
  $('trajetoria-livro').textContent = `📚 ${historia.livro}`;
  $('trajetoria-citacao').textContent = `“${historia.citacao}”`;

  const linha = $('trajetoria-linha');
  linha.innerHTML = '';
  for (const marco of historia.trajetoria || []) {
    const item = document.createElement('li');
    const quando = document.createElement('span');
    quando.className = 'quando';
    quando.textContent = marco.quando;
    item.appendChild(quando);
    item.append(marco.marco);
    linha.appendChild(item);
  }

  // So oferecemos o CTA do livro quando ha link garantido: ninguem deve
  // encontrar uma barreira de acesso depois do convite.
  const botaoLivro = $('btn-livro');
  if (historia.livro_url) {
    botaoLivro.href = historia.livro_url;
    botaoLivro.hidden = false;
    botaoLivro.onclick = () => registrar('book_clicked', { territorio: estado.territorio, historia_id: historia.id });
  } else {
    botaoLivro.hidden = true;
    botaoLivro.onclick = null;
  }

  mostrar('tela-trajetoria');
}

// ---------------------------------------------------------------------------
// Employer Branding + Estante de Talentos
// ---------------------------------------------------------------------------

function mostrarEmployerBranding() {
  const botaoVagas = $('btn-vagas');
  if (URL_OPORTUNIDADES) {
    botaoVagas.href = URL_OPORTUNIDADES;
    botaoVagas.hidden = false;
  }
  mostrar('tela-eb');
}

async function enviarTalento(evento) {
  evento.preventDefault();
  const form = evento.target;
  const erro = $('talentos-erro');
  erro.hidden = true;

  const dados = {
    nome: form.nome.value.trim(),
    email: form.email.value.trim(),
    area_interesse: form.area_interesse.value.trim() || null,
    linkedin: form.linkedin.value.trim() || null,
    mensagem: form.mensagem.value.trim() || null,
    territorio: estado.territorio,
    consentimento: form.consentimento.checked,
  };

  if (!dados.nome || !dados.email) {
    erro.textContent = 'Precisamos do seu nome e e-mail para manter contato.';
    erro.hidden = false;
    return;
  }
  if (!dados.consentimento) {
    erro.textContent = 'Para entrar na Estante de Talentos, precisamos do seu consentimento.';
    erro.hidden = false;
    return;
  }

  const botao = $('btn-enviar-talento');
  botao.disabled = true;
  try {
    const resposta = await fetch('/api/talentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => null);
      erro.textContent = corpo && corpo.erros ? corpo.erros.join(' ') : 'Não conseguimos salvar agora. Tente de novo.';
      erro.hidden = false;
      return;
    }
    registrar('talent_pool_completed', { territorio: estado.territorio });
    form.reset();
    mostrar('tela-talentos-ok');
  } catch {
    erro.textContent = 'Não conseguimos salvar agora. Tente de novo.';
    erro.hidden = false;
  } finally {
    botao.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Urna Alem da Pagina
// ---------------------------------------------------------------------------

function mostrarUrna() {
  $('urna-territorio').textContent = TERRITORIOS[estado.territorio].nome;
  if (!estado.experienciaConcluida) {
    estado.experienciaConcluida = true;
    registrar('experience_completed', { territorio: estado.territorio });
  }
  document.body.classList.add('final'); // fechamento dourado (Bilhete Dourado)
  mostrar('tela-urna');
}

function recomecar() {
  estado.sessao = novaSessao();
  estado.perguntaAtual = 0;
  estado.respostas = [];
  estado.territorio = null;
  estado.historias = [];
  estado.experienciaConcluida = false;
  delete document.body.dataset.territorio;
  document.body.classList.remove('final');
  mostrar('tela-entrada');
}

// ---------------------------------------------------------------------------
// Liga os botoes
// ---------------------------------------------------------------------------

$('btn-comecar').addEventListener('click', comecarQuiz);
$('btn-estante').addEventListener('click', mostrarEstante);
$('btn-voltar-estante').addEventListener('click', () => mostrar('tela-estante'));
$('btn-eb').addEventListener('click', mostrarEmployerBranding);
$('btn-vagas').addEventListener('click', () => registrar('careers_clicked', { territorio: estado.territorio }));
$('btn-talentos').addEventListener('click', () => {
  registrar('talent_pool_clicked', { territorio: estado.territorio });
  mostrar('tela-talentos');
});
$('btn-apos-talentos').addEventListener('click', mostrarUrna);
$('form-talentos').addEventListener('submit', enviarTalento);
$('btn-recomecar').addEventListener('click', recomecar);
