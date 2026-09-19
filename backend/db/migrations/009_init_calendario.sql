-- Itens nativos do Calendário (prazo/entrega avulsos, não originados de outro módulo).
-- Datas de Agenda, Tarefas, Conteúdo, Campanhas, Eventos e Projetos são agregadas
-- em tempo de consulta pela rota /api/calendario (ver src/routes/calendario.js).
CREATE TABLE IF NOT EXISTS calendario_itens (
    id              SERIAL PRIMARY KEY,
    titulo          TEXT NOT NULL,
    tipo            TEXT NOT NULL DEFAULT 'prazo' CHECK (tipo IN ('prazo', 'entrega')),
    segmento        TEXT NOT NULL DEFAULT 'geral'
                        CHECK (segmento IN ('geral', 'infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio')),
    etapa_infantil  TEXT
                        CHECK (etapa_infantil IS NULL OR etapa_infantil IN ('todo_infantil', 'maternal', 'jardim')),
    data            DATE NOT NULL,
    data_fim        DATE,
    observacoes     TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendario_itens_data ON calendario_itens(data);
