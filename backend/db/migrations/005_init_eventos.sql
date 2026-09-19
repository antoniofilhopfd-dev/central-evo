CREATE TABLE IF NOT EXISTS eventos (
    id                  SERIAL PRIMARY KEY,
    nome                TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'planejamento'
                            CHECK (status IN ('planejamento', 'pronto', 'concluido')),
    segmento            TEXT NOT NULL DEFAULT 'geral'
                            CHECK (segmento IN ('geral', 'infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio')),
    etapa_infantil      TEXT
                            CHECK (etapa_infantil IS NULL OR etapa_infantil IN ('todo_infantil', 'maternal', 'jardim')),
    data                DATE,
    hora                TIME,
    local               TEXT,
    descricao           TEXT,
    etapa_divulgacao    BOOLEAN NOT NULL DEFAULT false,
    etapa_foto          BOOLEAN NOT NULL DEFAULT false,
    etapa_video         BOOLEAN NOT NULL DEFAULT false,
    etapa_pos_evento    BOOLEAN NOT NULL DEFAULT false,
    checklist           JSONB NOT NULL DEFAULT '[]',
    link_principal      TEXT,
    campanha_id         INTEGER REFERENCES campanhas(id) ON DELETE SET NULL,
    projeto_id          INTEGER REFERENCES projetos(id) ON DELETE SET NULL,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_status ON eventos(status);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data);
