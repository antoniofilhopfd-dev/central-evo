CREATE TABLE IF NOT EXISTS arquivos (
    id              SERIAL PRIMARY KEY,
    nome            TEXT NOT NULL,
    tipo            TEXT NOT NULL DEFAULT 'outros'
                        CHECK (tipo IN ('drive', 'canva', 'documentos', 'fotos', 'outros')),
    segmento        TEXT NOT NULL DEFAULT 'geral'
                        CHECK (segmento IN ('geral', 'infantil', 'anos_iniciais', 'anos_finais', 'ensino_medio')),
    link            TEXT NOT NULL,
    descricao       TEXT,
    palavras_chave  TEXT,
    importante      BOOLEAN NOT NULL DEFAULT false,
    favorito        BOOLEAN NOT NULL DEFAULT false,
    usos            INTEGER NOT NULL DEFAULT 0,
    projeto_id      INTEGER REFERENCES projetos(id) ON DELETE SET NULL,
    evento_id       INTEGER REFERENCES eventos(id) ON DELETE SET NULL,
    conteudo_id     INTEGER REFERENCES conteudos(id) ON DELETE SET NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arquivos_tipo ON arquivos(tipo);
CREATE INDEX IF NOT EXISTS idx_arquivos_favorito ON arquivos(favorito);
