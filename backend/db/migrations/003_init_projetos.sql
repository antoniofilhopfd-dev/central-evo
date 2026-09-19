CREATE TABLE IF NOT EXISTS projetos (
    id                  SERIAL PRIMARY KEY,
    nome                TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'planejamento'
                            CHECK (status IN ('planejamento', 'em_andamento', 'pausado', 'concluido')),
    segmento            TEXT NOT NULL DEFAULT 'geral'
                            CHECK (segmento IN ('geral', 'infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio')),
    inicio              DATE,
    prazo_final         DATE,
    progresso           INTEGER NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
    prioridade          TEXT NOT NULL DEFAULT 'normal'
                            CHECK (prioridade IN ('normal', 'alta', 'baixa')),
    objetivo            TEXT,
    proximo_passo       TEXT,
    links_importantes   TEXT,
    observacoes         TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projeto_milestones (
    id          SERIAL PRIMARY KEY,
    projeto_id  INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    titulo      TEXT NOT NULL,
    concluido   BOOLEAN NOT NULL DEFAULT false,
    ordem       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_projetos_status ON projetos(status);
CREATE INDEX IF NOT EXISTS idx_projeto_milestones_projeto_id ON projeto_milestones(projeto_id);
