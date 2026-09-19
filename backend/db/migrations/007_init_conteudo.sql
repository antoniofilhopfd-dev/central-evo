CREATE TABLE IF NOT EXISTS conteudos (
    id                      SERIAL PRIMARY KEY,
    titulo                  TEXT NOT NULL,
    etapa                   TEXT NOT NULL DEFAULT 'ideia'
                                CHECK (etapa IN ('ideia', 'producao', 'aprovacao', 'programado', 'publicado')),
    tipo                    TEXT NOT NULL DEFAULT 'post'
                                CHECK (tipo IN ('post', 'reels', 'story', 'design', 'foto', 'outro')),
    segmento                TEXT NOT NULL DEFAULT 'geral'
                                CHECK (segmento IN ('geral', 'infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio')),
    etapa_infantil          TEXT
                                CHECK (etapa_infantil IS NULL OR etapa_infantil IN ('todo_infantil', 'maternal', 'jardim')),
    data_publicacao         DATE,
    briefing                TEXT,
    link                    TEXT,
    observacoes             TEXT,
    cta                     TEXT,
    objetivo                TEXT,
    checklist               JSONB NOT NULL DEFAULT '{"texto":false,"arte":false,"revisao":false,"aprovacao":false,"programacao":false}',
    evento_id               INTEGER REFERENCES eventos(id) ON DELETE SET NULL,
    campanha_id             INTEGER REFERENCES campanhas(id) ON DELETE SET NULL,
    projeto_id              INTEGER REFERENCES projetos(id) ON DELETE SET NULL,
    instagram_conteudo_id   INTEGER REFERENCES instagram_conteudos(id) ON DELETE SET NULL,
    ordem_kanban            INTEGER NOT NULL DEFAULT 0,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conteudos_etapa ON conteudos(etapa);
CREATE INDEX IF NOT EXISTS idx_conteudos_data_publicacao ON conteudos(data_publicacao);
