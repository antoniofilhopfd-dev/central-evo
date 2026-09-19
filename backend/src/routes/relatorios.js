const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Monta a cláusula de período. Os placeholders de data começam em $2 (o $1 é
// sempre reservado pro filtro de segmento nas duas queries do consolidado).
function condicaoPeriodo(periodo, inicio, fim, coluna = 'criado_em') {
  if (periodo === 'custom' && DATA_ISO.test(inicio) && DATA_ISO.test(fim)) {
    return { sql: `${coluna}::date BETWEEN $2::date AND $3::date`, params: [inicio, fim] };
  }
  if (periodo === '7') return { sql: `${coluna} >= CURRENT_DATE - INTERVAL '7 days'`, params: [] };
  if (periodo === '30') return { sql: `${coluna} >= CURRENT_DATE - INTERVAL '30 days'`, params: [] };
  return { sql: 'TRUE', params: [] };
}

router.get('/consolidado', async (req, res, next) => {
  try {
    const { periodo, segmento, inicio, fim } = req.query;
    const segmentoParam = segmento || null;
    const filtroSeg = `AND ($1::text IS NULL OR segmento = $1)`;
    const cp = condicaoPeriodo(periodo, inicio, fim);

    const [tarefas, agendaFutura] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status <> 'concluida')::int AS abertas,
          COUNT(*) FILTER (WHERE status = 'concluida')::int AS concluidas,
          COUNT(*) FILTER (WHERE status = 'a_fazer')::int AS a_fazer,
          COUNT(*) FILTER (WHERE status = 'em_andamento')::int AS em_andamento,
          COUNT(*) FILTER (WHERE status = 'aguardando')::int AS aguardando
        FROM tarefas WHERE ${cp.sql} ${filtroSeg}
      `, [segmentoParam, ...cp.params]),
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM agenda_itens WHERE data >= CURRENT_DATE) AS proximos_compromissos,
          (SELECT COUNT(*)::int FROM tarefas WHERE prazo >= CURRENT_DATE AND status <> 'concluida') AS proximos_prazos
      `),
    ]);

    res.json({
      tarefas: tarefas.rows[0],
      agenda_futura: agendaFutura.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
