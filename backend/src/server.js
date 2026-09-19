require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, APP_ENV } = require('./db');
const tarefasRouter = require('./routes/tarefas');
const agendaRouter = require('./routes/agenda');
const calendarioRouter = require('./routes/calendario');
const conteudoRouter = require('./routes/conteudo');
const campanhasRouter = require('./routes/campanhas');
const eventosRouter = require('./routes/eventos');
const projetosRouter = require('./routes/projetos');
const arquivosRouter = require('./routes/arquivos');
const instagramRouter = require('./routes/instagram');
const relatoriosRouter = require('./routes/relatorios');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', ambiente: APP_ENV, banco: 'conectado' });
  } catch (err) {
    res.status(503).json({ status: 'erro', ambiente: APP_ENV, banco: 'indisponivel', detalhe: err.message });
  }
});

app.use('/api/tarefas', tarefasRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/calendario', calendarioRouter);
app.use('/api/conteudos', conteudoRouter);
app.use('/api/campanhas', campanhasRouter);
app.use('/api/eventos', eventosRouter);
app.use('/api/projetos', projetosRouter);
app.use('/api/arquivos', arquivosRouter);
app.use('/api/instagram', instagramRouter);
app.use('/api/relatorios', relatoriosRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno', detalhe: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Central Evolução rodando na porta ${PORT} [ambiente: ${APP_ENV}]`);
});
