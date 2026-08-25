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
