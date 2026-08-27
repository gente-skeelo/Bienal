# Bienal — Skeelo

Backend da Bienal em Node + Express com Postgres, pronto para rodar no
[Railway](https://railway.app). Duas frentes no mesmo serviço:

- **API da programação** — cada linha da tabela `eventos` é uma atividade da
  grade: palestra, mesa, oficina, sessão de autógrafos.
- **App "Próximo Capítulo"** (Bienal 2026) — a experiência mobile de
  Comunicação Interna + Employer Branding servida em **`/app`**: quiz de 7
  perguntas → território (**Aprender · Evoluir · Imaginar**) → Estante dos
  Skeelers com histórias reais de carreira → Estante de Talentos → Urna Além
  da Página.

---

## Subir no Railway (banco + URL pública)

1. **Criar o projeto**: *New Project → Deploy from GitHub repo →* `gente-skeelo/Bienal`.
2. **Adicionar o banco**: dentro do projeto, *New → Database → Add PostgreSQL*.
   O Railway cria a variável `DATABASE_URL` e injeta no serviço da API sozinho —
   não precisa copiar nada à mão.
3. **Gerar a URL pública**: no serviço da API, *Settings → Networking →
   Generate Domain*. Sai algo como `https://bienal-production.up.railway.app`.
4. Abra a URL no navegador: a home lista os endpoints. `/health` deve responder
   `{"status":"ok","banco":"ok"}`.

O schema é aplicado sozinho no start (`server.js` roda a migração antes de
escutar a porta), então o banco nasce pronto no primeiro deploy.

Para popular com exemplos, rode uma vez no terminal do Railway (ou local
apontando para o banco): `npm run seed`.

---

## Rodar na sua máquina

```bash
npm install
cp .env.example .env          # ajuste o DATABASE_URL para o seu Postgres local
export $(grep -v '^#' .env | xargs)
npm run seed                  # cria as tabelas e insere exemplos
npm start                     # http://localhost:3000
```

Sem Postgres local? Dá para apontar o `DATABASE_URL` para o banco do Railway
usando a URL pública dele (aba *Variables* do Postgres, campo
`DATABASE_PUBLIC_URL`). A app liga SSL sozinha nesse caso.

---

## Endpoints

| Método | Rota | O que faz |
| --- | --- | --- |
| `GET` | `/health` | status da API e do banco |
| `GET` | `/api/eventos` | lista a programação |
| `GET` | `/api/eventos/:id` | um evento |
| `POST` | `/api/eventos` | cria evento |
| `PATCH` | `/api/eventos/:id` | atualiza só os campos enviados |
| `DELETE` | `/api/eventos/:id` | remove evento |
| `GET` | `/api/categorias` | categorias em uso, com contagem |
| `GET` | `/api/locais` | locais em uso, com contagem |

### Filtros do `GET /api/eventos`

| Filtro | Exemplo | Observação |
| --- | --- | --- |
| `data` | `?data=2026-09-05` | dia da grade, no fuso de São Paulo |
| `categoria` | `?categoria=Oficina` | ignora maiúsculas/minúsculas |
| `local` | `?local=Sala Azul` | ignora maiúsculas/minúsculas |
| `destaque` | `?destaque=true` | só os destaques |
| `busca` | `?busca=leitura` | procura em título, descrição e participantes |
| `limite` / `pagina` | `?limite=20&pagina=2` | padrão 100 por página, máximo 200 |

A resposta vem assim:

```json
{ "total": 42, "pagina": 1, "limite": 100, "eventos": [ ... ] }
```

Os filtros se combinam: `?data=2026-09-05&categoria=Oficina&destaque=true`.

### Campos de um evento

| Campo | Tipo | Obrigatório |
| --- | --- | --- |
| `titulo` | texto | sim |
| `inicio` | data ISO 8601 | sim |
| `fim` | data ISO 8601 ou `null` | não (se vier, tem que ser depois do `inicio`) |
| `descricao` | texto | não |
| `local` | texto | não |
| `categoria` | texto | não |
| `participantes` | lista de textos | não (padrão `[]`) |
| `destaque` | `true` / `false` | não (padrão `false`) |

`id`, `criado_em` e `atualizado_em` são preenchidos pelo banco.

### Exemplo de criação

```bash
curl -X POST https://SUA-URL.up.railway.app/api/eventos \
  -H 'Content-Type: application/json' \
  -d '{
    "titulo": "Mesa: o futuro da leitura digital",
    "descricao": "Conversa sobre hábitos de leitura e acesso ao livro.",
    "inicio": "2026-09-04T14:00:00-03:00",
    "fim": "2026-09-04T15:30:00-03:00",
    "local": "Sala Azul",
    "categoria": "Mesa redonda",
    "participantes": ["Convidada 1", "Mediadora"],
    "destaque": true
  }'
```

Erros de validação voltam com status `400` e mensagens em português:

```json
{ "erros": ["titulo e obrigatorio.", "inicio e obrigatorio."] }
```

O CORS está liberado para qualquer origem, então dá para consumir a API
direto de um front-end sem configuração extra.

---

## App "Próximo Capítulo" (Bienal 2026)

A experiência fica em **`/app`** (ex.:
`https://SUA-URL.up.railway.app/app/`) — é para lá que apontam o QR Code e os
tablets do estande. Princípios do rascunho: mobile first, sem login, ~1 minuto
de quiz, 1 pergunta por tela, botões grandes, resultado sem pedir dados e
captura de dados só com interesse explícito.

O time ajusta tudo pelo **painel de gestão em `/admin`** — sem mexer em
código nem fazer deploy:

- **Histórias** — criar, editar, ordenar, ativar/desativar e excluir as
  histórias das três estantes (com linha do tempo da trajetória);
- **Talentos** — ver quem entrou na Estante de Talentos e baixar CSV;
- **Métricas** — o funil da experiência (visitantes únicos por evento),
  distribuição de territórios e histórias mais vistas;
- **Configurações** — o link do botão "Conhecer oportunidades no Skeelo"
  (vazio = botão oculto no app).

Com `CHAVE_ADMIN` definida no ambiente, o painel pede a chave uma vez e a
guarda no navegador.

O fluxo implementado:

```
Entrada → Quiz (7 perguntas) → Reveal → Resultado (território)
→ Estante dos Skeelers (3 livros + 3 histórias + 3 trajetórias)
→ Trajetória do Skeeler → Employer Branding
→ Oportunidades / Estante de Talentos → Urna Além da Página
```

### Conteúdo parametrizável (Estantes dos Skeelers)

As histórias que aparecem no app vêm da tabela `historias` — o `npm run seed`
insere 9 placeholders (3 por território) e as histórias reais entram depois
pela API, sem novo deploy:

| Método | Rota | O que faz |
| --- | --- | --- |
| `GET` | `/api/historias` | lista as histórias ativas (filtro `?territorio=aprender\|evoluir\|imaginar`; `?todas=true` inclui inativas) |
| `GET` | `/api/historias/:id` | uma história |
| `POST` | `/api/historias` | cria história |
| `PATCH` | `/api/historias/:id` | atualiza só os campos enviados (ex.: `{"ativo": false}` tira do ar) |
| `DELETE` | `/api/historias/:id` | remove história |

Campos: `territorio` (obrigatório: `aprender`, `evoluir` ou `imaginar`),
`livro`, `citacao`, `skeeler_nome`, `skeeler_cargo` (obrigatórios), `resumo`
(mini trajetória em uma linha), `trajetoria` (lista de marcos
`{"quando": "2022", "marco": "Entrou como Software Engineer"}`), `livro_url`
(o CTA "Conhecer o livro no Skeelo" só aparece quando há link garantido),
`ordem` e `ativo`.

A leitura é pública (o app monta as estantes com ela); criar, editar e excluir
exigem `CHAVE_ADMIN` quando a variável está definida.

### Estante de Talentos

| Método | Rota | O que faz |
| --- | --- | --- |
| `POST` | `/api/talentos` | inscrição vinda do app (`nome`, `email` e `consentimento: true` obrigatórios; `area_interesse`, `linkedin`, `mensagem`, `territorio` opcionais) |
| `GET` | `/api/talentos` | listagem para o time de People |

Reinscrição com o mesmo e-mail atualiza o cadastro em vez de duplicar. A
listagem expõe dados pessoais: defina **`CHAVE_ADMIN`** no ambiente (ver
`.env.example`) para exigir `Authorization: Bearer <chave>` — sem a variável a
rota fica aberta, o que serve só para desenvolvimento.

### Analytics essenciais

O front registra os eventos do rascunho em `POST /api/metricas`
(`quiz_started`, `quiz_completed`, `territory_result`, `skeeler_story_viewed`,
`book_clicked`, `careers_clicked`, `talent_pool_clicked`,
`talent_pool_completed`, `experience_completed`, `token_redeemed`), com
território, história e uma sessão anônima por visita.

`GET /api/metricas/resumo` devolve a visão agregada: total e sessões únicas
por evento (o funil quiz → território → história → carreira → Estante de
Talentos), distribuição de territórios e histórias mais vistas.

### Configurações — `/api/config`

`GET /api/config` (público) devolve as configurações que o app usa — hoje,
`url_oportunidades`, o link do botão "Conhecer oportunidades no Skeelo"
(vazio = botão oculto). `PATCH /api/config` atualiza (protegido por
`CHAVE_ADMIN`); o jeito mais fácil é pela aba **Configurações** do `/admin`.

---

## Estrutura

```
server.js                        sobe o servidor (aplica o schema antes de escutar)
src/app.js                       rotas gerais, home, /health, tratamento de erro
src/db.js                        conexão com o Postgres (lê DATABASE_URL)
src/schema.sql                   tabelas: eventos, historias, talentos, metricas, config
src/migrar.js                    aplica o schema.sql
src/seed.js                      insere eventos e histórias de exemplo
src/validacao.js                 valida o corpo das requisições
src/seguranca.js                 proteção por CHAVE_ADMIN das rotas de gestão
src/rotas/eventos.js             CRUD de /api/eventos
src/rotas/historias.js           CRUD de /api/historias (Estantes dos Skeelers)
src/rotas/talentos.js            /api/talentos (Estante de Talentos)
src/rotas/metricas.js            /api/metricas (analytics essenciais)
src/rotas/config.js              /api/config (configurações ajustáveis pelo painel)
public/app/                      o app "Próximo Capítulo" (HTML + CSS + JS puros)
public/admin/                    o painel de gestão em /admin
testes/api.test.js               testes de integração da programação
testes/proximo-capitulo.test.js  testes de integração do app
```

## Testes

Precisam de um Postgres local (os testes limpam as tabelas, por isso recusam
rodar contra banco remoto):

```bash
DATABASE_URL=postgres://postgres@localhost:5432/bienal_teste npm run teste
```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm start` | aplica o schema e sobe a API |
| `npm run migrar` | só aplica o schema |
| `npm run seed` | insere exemplos (`-- --limpar` apaga antes) |
| `npm run teste` | roda todos os testes de integração |
| `npm run teste:api` | só os testes da programação |
| `npm run teste:app` | só os testes do app Próximo Capítulo |
