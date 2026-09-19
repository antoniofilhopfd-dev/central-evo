-- Etapa 1: módulo Tarefas
CREATE TABLE IF NOT EXISTS tarefas (
    id              SERIAL PRIMARY KEY,
    titulo          TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'a_fazer'
                        CHECK (status IN ('a_fazer', 'em_andamento', 'aguardando', 'concluida')),
    prioridade      TEXT NOT NULL DEFAULT 'normal'
                        CHECK (prioridade IN ('alta', 'normal', 'baixa')),
    segmento        TEXT NOT NULL DEFAULT 'geral'
                        CHECK (segmento IN ('geral', 'infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio')),
    etapa_infantil  TEXT
                        CHECK (etapa_infantil IS NULL OR etapa_infantil IN ('todo_infantil', 'maternal', 'jardim')),
    prazo           DATE,
    aguardando_de   TEXT,
    observacoes     TEXT,
    responsavel     TEXT,
    recorrencia     TEXT
                        CHECK (recorrencia IS NULL OR recorrencia IN ('diaria', 'semanal', 'mensal')),
    ordem_kanban    INTEGER NOT NULL DEFAULT 0,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tarefa_subtarefas (
    id          SERIAL PRIMARY KEY,
    tarefa_id   INTEGER NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
    titulo      TEXT NOT NULL,
    concluida   BOOLEAN NOT NULL DEFAULT false,
    ordem       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_prazo ON tarefas(prazo);
CREATE INDEX IF NOT EXISTS idx_tarefa_subtarefas_tarefa_id ON tarefa_subtarefas(tarefa_id);
