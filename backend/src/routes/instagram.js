const express = require('express');
const { pool } = require('../db');
const { createCrudRouter } = require('../crudFactory');

const router = express.Router();

const camposConteudo = [
  'conta', 'data', 'tipo', 'segmento', 'titulo', 'alcance', 'impressoes',
  'curtidas', 'comentarios', 'compartilhamentos', 'salvamentos', 'cliques',
  'visualizacoes', 'seguidores_ganhos', 'link', 'observacoes',
];
const conteudosRouter = createCrudRouter({
  table: 'instagram_conteudos',
  campos: camposConteudo,
  obrigatorios: ['conta', 'data', 'titulo'],
  ordenarPor: 'data DESC',
});

const camposMetricas = [
  'conta', 'data_inicial', 'data_final', 'seguidores_final', 'alcance', 'impressoes',
  'visitas_perfil', 'interacoes', 'cliques_link', 'seguidores_ganhos', 'seguidores_perdidos',
  'posts_publicados', 'reels_publicados', 'stories_publicados', 'observacoes',
];
const metricasRouter = createCrudRouter({
  table: 'instagram_metricas_conta',
  campos: camposMetricas,
  obrigatorios: ['conta', 'data_inicial', 'data_final'],
  ordenarPor: 'data_final DESC',
});

router.use('/conteudos', conteudosRouter);
router.use('/metricas-conta', metricasRouter);

// GET /api/instagram/resumo?conta=&periodo=30|7|mes|tudo
function condicaoPeriodo(periodo) {
  switch (periodo) {
    case '7': return `data >= CURRENT_DATE - INTERVAL '7 days'`;
    case '30': return `data >= CURRENT_DATE - INTERVAL '30 days'`;
    case 'mes': return `date_trunc('month', data) = date_trunc('month', CURRENT_DATE)`;
    default: return `TRUE`;
  }
}

router.get('/resumo', async (req, res, next) => {
  try {
    const { conta, periodo } = req.query;
    const where = [condicaoPeriodo(periodo)];
    const params = [];
    if (conta) {
      params.push(conta);
      where.push(`conta = $${params.length}`);
    }
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS conteudos,
        COALESCE(SUM(alcance), 0)::int AS alcance,
        COALESCE(SUM(curtidas + comentarios + compartilhamentos + salvamentos), 0)::int AS engajamentos,
        COALESCE(SUM(seguidores_ganhos), 0)::int AS seguidores_ganhos,
        CASE WHEN COALESCE(SUM(alcance), 0) = 0 THEN 0
             ELSE ROUND(100.0 * SUM(curtidas + comentarios + compartilhamentos + salvamentos) / SUM(alcance), 2)
        END AS taxa_media
      FROM instagram_conteudos WHERE ${where.join(' AND ')}
    `, params);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/ranking', async (req, res, next) => {
  try {
    const { conta, periodo, tipo, segmento } = req.query;
    const where = [condicaoPeriodo(periodo)];
    const params = [];
    if (conta) { params.push(conta); where.push(`conta = $${params.length}`); }
    if (tipo) { params.push(tipo); where.push(`tipo = $${params.length}`); }
    if (segmento) { params.push(segmento); where.push(`segmento = $${params.length}`); }
    const { rows } = await pool.query(`
      SELECT *, (curtidas + comentarios + compartilhamentos + salvamentos) AS engajamento
      FROM instagram_conteudos WHERE ${where.join(' AND ')}
      ORDER BY engajamento DESC LIMIT 20
    `, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/comparativo-contas', async (req, res, next) => {
  try {
    const { periodo } = req.query;
    const where = condicaoPeriodo(periodo);
    const { rows } = await pool.query(`
      SELECT
        conta,
        COUNT(*)::int AS conteudos,
        COALESCE(SUM(alcance), 0)::int AS alcance,
        COALESCE(SUM(curtidas + comentarios + compartilhamentos + salvamentos), 0)::int AS engajamentos,
        COALESCE(SUM(seguidores_ganhos), 0)::int AS seguidores_ganhos,
        CASE WHEN COALESCE(SUM(alcance), 0) = 0 THEN 0
             ELSE ROUND(100.0 * SUM(curtidas + comentarios + compartilhamentos + salvamentos) / SUM(alcance), 2)
        END AS taxa_media
      FROM instagram_conteudos WHERE ${where}
      GROUP BY conta
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
