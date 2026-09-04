-- Tabela unica da programacao da Bienal.
-- Cada linha e uma atividade da grade: palestra, mesa, sessao de autografos, oficina...
CREATE TABLE IF NOT EXISTS eventos (
  id            SERIAL PRIMARY KEY,
  titulo        TEXT        NOT NULL,
  descricao     TEXT,
  inicio        TIMESTAMPTZ NOT NULL,
  fim           TIMESTAMPTZ,
  local         TEXT,
  categoria     TEXT,
  participantes TEXT[]      NOT NULL DEFAULT '{}',
  destaque      BOOLEAN     NOT NULL DEFAULT FALSE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eventos_inicio_idx    ON eventos (inicio);
CREATE INDEX IF NOT EXISTS eventos_categoria_idx ON eventos (categoria);
CREATE INDEX IF NOT EXISTS eventos_local_idx     ON eventos (local);

-- App "Proximo Capitulo" (Bienal 2026): historias reais de carreira dos
-- Skeelers que formam as Estantes (Aprender, Evoluir, Imaginar). O conteudo e
-- parametrizavel: as historias entram/saem pela API, sem novo deploy.
CREATE TABLE IF NOT EXISTS historias (
  id            SERIAL PRIMARY KEY,
  territorio    TEXT    NOT NULL CHECK (territorio IN ('aprender', 'evoluir', 'imaginar')),
  livro         TEXT    NOT NULL,
  livro_url     TEXT,             -- so exibimos o CTA do livro quando ha link garantido
  citacao       TEXT    NOT NULL, -- "Esse livro me acompanhou quando..."
  indicacao     TEXT,             -- "Indicacao do Skeelo": o livro que temos no acervo, ligado a historia
  foto          TEXT,             -- foto do Skeeler como data URL (JPEG base64, reduzida no painel)
  skeeler_nome  TEXT    NOT NULL,
  skeeler_cargo TEXT    NOT NULL,
  resumo        TEXT,             -- mini trajetoria em uma linha: "Software Engineer -> novos projetos -> lideranca"
  trajetoria    JSONB   NOT NULL DEFAULT '[]', -- [{"quando": "2022", "marco": "Entrou como Software Engineer"}]
  ordem         INTEGER NOT NULL DEFAULT 0,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colunas adicionadas depois do primeiro deploy (o CREATE TABLE so vale para
-- banco novo).
ALTER TABLE historias ADD COLUMN IF NOT EXISTS indicacao TEXT;
ALTER TABLE historias ADD COLUMN IF NOT EXISTS foto TEXT;

CREATE INDEX IF NOT EXISTS historias_territorio_idx ON historias (territorio, ativo, ordem);

-- Estante de Talentos: quem quer ficar perto dos proximos capitulos do Skeelo.
-- Entrada opcional, com consentimento explicito (LGPD).
CREATE TABLE IF NOT EXISTS talentos (
  id             SERIAL PRIMARY KEY,
  nome           TEXT    NOT NULL,
  email          TEXT    NOT NULL,
  telefone       TEXT,
  area_interesse TEXT,
  linkedin       TEXT,
  mensagem       TEXT,   -- "conte um pouco sobre sua trajetoria"
  territorio     TEXT    CHECK (territorio IN ('aprender', 'evoluir', 'imaginar')),
  maioridade     BOOLEAN,  -- declaracao de 18+ feita no formulario
  consentimento  BOOLEAN NOT NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coluna adicionada depois do primeiro deploy: o CREATE TABLE acima so vale
-- para banco novo, entao bancos que ja existiam precisam do ALTER.
ALTER TABLE talentos ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE talentos ADD COLUMN IF NOT EXISTS maioridade BOOLEAN;

-- Quem se inscreve duas vezes atualiza o proprio cadastro em vez de duplicar.
CREATE UNIQUE INDEX IF NOT EXISTS talentos_email_idx ON talentos (lower(email));

-- Analytics essenciais da experiencia (quiz -> territorio -> historia -> carreira).
CREATE TABLE IF NOT EXISTS metricas (
  id          BIGSERIAL PRIMARY KEY,
  evento      TEXT NOT NULL,
  territorio  TEXT,
  historia_id INTEGER,
  sessao      TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS metricas_evento_idx ON metricas (evento, criado_em);

-- Configuracoes ajustaveis pelo painel /admin, sem novo deploy.
CREATE TABLE IF NOT EXISTS config (
  chave         TEXT PRIMARY KEY,
  valor         TEXT NOT NULL DEFAULT '',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link do botao "Conhecer oportunidades no Skeelo"; vazio = botao oculto no app.
INSERT INTO config (chave, valor) VALUES ('url_oportunidades', '')
ON CONFLICT (chave) DO NOTHING;
