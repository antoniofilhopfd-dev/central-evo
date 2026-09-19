CREATE TABLE IF NOT EXISTS instagram_conteudos (
    id                  SERIAL PRIMARY KEY,
    conta               TEXT NOT NULL CHECK (conta IN ('evolucaopb', 'geracaoevolucao')),
    data                DATE NOT NULL,
    tipo                TEXT NOT NULL DEFAULT 'post' CHECK (tipo IN ('post', 'reels', 'story')),
    segmento            TEXT NOT NULL DEFAULT 'geral'
                            CHECK (segmento IN ('geral', 'infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio')),
    titulo              TEXT NOT NULL,
    alcance             INTEGER DEFAULT 0,
    impressoes          INTEGER DEFAULT 0,
    curtidas            INTEGER DEFAULT 0,
    comentarios         INTEGER DEFAULT 0,
    compartilhamentos   INTEGER DEFAULT 0,
    salvamentos         INTEGER DEFAULT 0,
    cliques             INTEGER DEFAULT 0,
    visualizacoes       INTEGER DEFAULT 0,
    seguidores_ganhos   INTEGER DEFAULT 0,
    link                TEXT,
    observacoes         TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instagram_metricas_conta (
    id                  SERIAL PRIMARY KEY,
    conta               TEXT NOT NULL CHECK (conta IN ('evolucaopb', 'geracaoevolucao')),
    data_inicial        DATE NOT NULL,
    data_final          DATE NOT NULL,
    seguidores_final    INTEGER DEFAULT 0,
    alcance             INTEGER DEFAULT 0,
    impressoes          INTEGER DEFAULT 0,
    visitas_perfil      INTEGER DEFAULT 0,
    interacoes          INTEGER DEFAULT 0,
    cliques_link        INTEGER DEFAULT 0,
    seguidores_ganhos   INTEGER DEFAULT 0,
    seguidores_perdidos INTEGER DEFAULT 0,
    posts_publicados    INTEGER DEFAULT 0,
    reels_publicados    INTEGER DEFAULT 0,
    stories_publicados  INTEGER DEFAULT 0,
    observacoes         TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_conteudos_conta_data ON instagram_conteudos(conta, data);
CREATE INDEX IF NOT EXISTS idx_ig_metricas_conta_data ON instagram_metricas_conta(conta, data_final);
