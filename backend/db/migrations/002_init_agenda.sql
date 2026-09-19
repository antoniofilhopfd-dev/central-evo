CREATE TABLE IF NOT EXISTS agenda_itens (
    id              SERIAL PRIMARY KEY,
    titulo          TEXT NOT NULL,
    tipo            TEXT NOT NULL DEFAULT 'compromisso'
                        CHECK (tipo IN ('compromisso', 'reuniao', 'evento')),
    data            DATE NOT NULL,
    hora            TIME,
    local           TEXT,
    observacoes     TEXT,
    segmento        TEXT NOT NULL DEFAULT 'geral'
                        CHECK (segmento IN ('geral', 'infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio')),
    etapa_infantil  TEXT
                        CHECK (etapa_infantil IS NULL OR etapa_infantil IN ('todo_infantil', 'maternal', 'jardim')),
    recorrencia     TEXT
                        CHECK (recorrencia IS NULL OR recorrencia IN ('diaria', 'semanal', 'mensal')),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_data ON agenda_itens(data);
CREATE INDEX IF NOT EXISTS idx_agenda_tipo ON agenda_itens(tipo);
