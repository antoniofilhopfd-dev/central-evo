CREATE TABLE IF NOT EXISTS campanhas (
    id                  SERIAL PRIMARY KEY,
    nome                TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'planejamento'
                            CHECK (status IN ('planejamento', 'ativa', 'pausada', 'encerrada')),
    segmento            TEXT NOT NULL DEFAULT 'geral'
                            CHECK (segmento IN ('geral', 'infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio')),
    inicio              DATE,
    fim                 DATE,
    objetivo            TEXT,
    orcamento_previsto  NUMERIC(12,2) DEFAULT 0,
    valor_investido     NUMERIC(12,2) DEFAULT 0,
    valor_conversao     NUMERIC(12,2) DEFAULT 0,
    leads               INTEGER DEFAULT 0,
    contatos            INTEGER DEFAULT 0,
    conversoes          INTEGER DEFAULT 0,
    pecas_criativos     TEXT,
    link_principal      TEXT,
    observacoes         TEXT,
    projeto_id          INTEGER REFERENCES projetos(id) ON DELETE SET NULL,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_projeto_id ON campanhas(projeto_id);
