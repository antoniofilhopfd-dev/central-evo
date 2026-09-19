const express = require('express');
const { pool } = require('../db');

const router = express.Router();

function condicaoPeriodo(periodo, coluna = 'criado_em') {
  switch (periodo) {
    case '7': return `${coluna} >= CURRENT_DATE - INTERVAL '7 days'`;
    case '30': return `${coluna} >= CURRENT_DATE - INTERVAL '30 days'`;
    default: return 'TRUE';
  }
}

router.get('/consolidado', async (req, res, next) => {
  try {
    const { periodo, segmento } = req.query;
    const segmentoParam = segmento || null;
    const filtroSeg = `AND ($1::text IS NULL OR segmento = $1)`;

    const [tarefas, agendaFutura] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status <> 'concluida')::int AS abertas,
          COUNT(*) FILTER (WHERE status = 'concluida')::int AS concluidas,
          COUNT(*) FILTER (WHERE status = 'a_fazer')::int AS a_fazer,
          COUNT(*) FILTER (WHERE status = 'em_andamento')::int AS em_andamento,
          COUNT(*) FILTER (WHERE status = 'aguardando')::int AS aguardando
        FROM tarefas WHERE ${condicaoPeriodo(periodo)} ${filtroSeg}
      `, [segmentoParam]),
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
