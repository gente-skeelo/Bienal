# Bienal — API da Programação

Backend da programação da Bienal: uma API REST em Node + Express com Postgres,
pronta para rodar no [Railway](https://railway.app).

Cada linha da tabela `eventos` é uma atividade da grade — palestra, mesa,
oficina, sessão de autógrafos.

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

## Estrutura

```
server.js              sobe o servidor (aplica o schema antes de escutar)
src/app.js             rotas gerais, home, /health, tratamento de erro
src/db.js              conexão com o Postgres (lê DATABASE_URL)
src/schema.sql         a tabela eventos
src/migrar.js          aplica o schema.sql
src/seed.js            insere eventos de exemplo
src/validacao.js       valida o corpo das requisições
src/rotas/eventos.js   CRUD de /api/eventos
testes/api.test.js     testes de integração
```

## Testes

Precisam de um Postgres local (os testes limpam a tabela, por isso recusam
rodar contra banco remoto):

```bash
DATABASE_URL=postgres://postgres@localhost:5432/bienal_teste npm run teste:api
```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm start` | aplica o schema e sobe a API |
| `npm run migrar` | só aplica o schema |
| `npm run seed` | insere exemplos (`-- --limpar` apaga antes) |
| `npm run teste:api` | roda os testes de integração |
