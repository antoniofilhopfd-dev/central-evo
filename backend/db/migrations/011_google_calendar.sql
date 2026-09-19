ALTER TABLE agenda_itens ADD COLUMN IF NOT EXISTS google_event_id TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS google_calendar_config (
    id                      SERIAL PRIMARY KEY,
    access_token            TEXT,
    refresh_token           TEXT,
    expiry_date             BIGINT,
    calendar_id             TEXT NOT NULL DEFAULT 'primary',
    ultima_sincronizacao    TIMESTAMPTZ,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);
