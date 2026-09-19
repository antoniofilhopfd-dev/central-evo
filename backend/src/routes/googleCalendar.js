const express = require('express');
const { google } = require('googleapis');
const { pool } = require('../db');

const router = express.Router();

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

function criarOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function lerConfig() {
  const { rows } = await pool.query('SELECT * FROM google_calendar_config ORDER BY id LIMIT 1');
  return rows[0] || null;
}

async function salvarTokens(tokens) {
  const existente = await lerConfig();
  if (existente) {
    await pool.query(
      `UPDATE google_calendar_config SET
         access_token = $1,
         refresh_token = COALESCE($2, refresh_token),
         expiry_date = $3,
         atualizado_em = now()
       WHERE id = $4`,
      [tokens.access_token, tokens.refresh_token || null, tokens.expiry_date || null, existente.id]
    );
  } else {
    await pool.query(
      `INSERT INTO google_calendar_config (access_token, refresh_token, expiry_date) VALUES ($1, $2, $3)`,
      [tokens.access_token, tokens.refresh_token || null, tokens.expiry_date || null]
    );
  }
}

// GET /api/google-calendar/status
router.get('/status', async (req, res, next) => {
  try {
    const config = await lerConfig();
    res.json({
      conectado: !!(config && config.refresh_token),
      ultima_sincronizacao: config ? config.ultima_sincronizacao : null,
      configurado: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/google-calendar/conectar - redireciona pro consentimento do Google
router.get('/conectar', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(400).json({ erro: 'Credenciais do Google não configuradas no .env (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI)' });
  }
  const oauth2Client = criarOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
  res.redirect(url);
});

// GET /api/google-calendar/callback - Google volta pra cá com o código
router.get('/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Código de autorização ausente.');
    const oauth2Client = criarOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    await salvarTokens(tokens);
    res.send('<html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Google Calendário conectado!</h2><p>Pode fechar esta aba e voltar para a Central Evolução.</p></body></html>');
  } catch (err) {
    next(err);
  }
});

// POST /api/google-calendar/sincronizar - importa eventos do Google para a Agenda
router.post('/sincronizar', async (req, res, next) => {
  try {
    const config = await lerConfig();
    if (!config || !config.refresh_token) {
      return res.status(400).json({ erro: 'Google Calendário ainda não conectado.' });
    }

    const oauth2Client = criarOAuthClient();
    oauth2Client.setCredentials({
      access_token: config.access_token,
      refresh_token: config.refresh_token,
      expiry_date: config.expiry_date,
    });
    oauth2Client.on('tokens', (tokens) => { salvarTokens(tokens).catch(() => {}); });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const agora = new Date();
    const em90Dias = new Date(agora.getTime() + 90 * 24 * 60 * 60 * 1000);

    const { data } = await calendar.events.list({
      calendarId: config.calendar_id || 'primary',
      timeMin: agora.toISOString(),
      timeMax: em90Dias.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    let importados = 0;
    let atualizados = 0;

    for (const evento of data.items || []) {
      if (!evento.id || evento.status === 'cancelled') continue;
      const inicio = evento.start && (evento.start.dateTime || evento.start.date);
      if (!inicio) continue;
      const dataISO = inicio.split('T')[0];
      const hora = evento.start.dateTime ? inicio.split('T')[1].slice(0, 5) : null;
      const titulo = evento.summary || '(sem título)';
      const local = evento.location || null;

      const { rows: existentes } = await pool.query(
        'SELECT id FROM agenda_itens WHERE google_event_id = $1', [evento.id]
      );

      if (existentes.length > 0) {
        await pool.query(
          `UPDATE agenda_itens SET titulo = $1, data = $2, hora = $3, local = $4, atualizado_em = now()
           WHERE google_event_id = $5`,
          [titulo, dataISO, hora, local, evento.id]
        );
        atualizados += 1;
      } else {
        await pool.query(
          `INSERT INTO agenda_itens (titulo, tipo, data, hora, local, segmento, google_event_id)
           VALUES ($1, 'evento', $2, $3, $4, 'geral', $5)`,
          [titulo, dataISO, hora, local, evento.id]
        );
        importados += 1;
      }
    }

    await pool.query(
      `UPDATE google_calendar_config SET ultima_sincronizacao = now() WHERE id = $1`,
      [config.id]
    );

    res.json({ importados, atualizados, total: (data.items || []).length });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/google-calendar/desconectar
router.delete('/desconectar', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM google_calendar_config');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
