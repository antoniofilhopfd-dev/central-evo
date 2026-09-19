const express = require('express');
const { pool } = require('../db');
const { createCrudRouter } = require('../crudFactory');

const router = express.Router();

// CRUD dos itens nativos do calendário (prazo/entrega avulsos)
const itensRouter = createCrudRouter({
  table: 'calendario_itens',
  campos: ['titulo', 'tipo', 'segmento', 'etapa_infantil', 'data', 'data_fim', 'observacoes'],
  obrigatorios: ['titulo', 'data'],
  ordenarPor: 'data ASC',
});
router.use('/itens', itensRouter);

const UNIAO_ORIGENS = `
  SELECT id, titulo, tipo, 'calendario' AS origem, segmento, etapa_infantil, data, data_fim, observacoes
    FROM calendario_itens
  UNION ALL
  SELECT id, titulo, 'evento' AS tipo, 'agenda' AS origem, segmento, etapa_infantil, data, NULL AS data_fim, observacoes
    FROM agenda_itens
  UNION ALL
  SELECT id, titulo, 'prazo' AS tipo, 'tarefas' AS origem, segmento, etapa_infantil, prazo AS data, NULL AS data_fim, observacoes
    FROM tarefas WHERE prazo IS NOT NULL
`;

// GET /api/calendario?mes=9&ano=2026&segmento=&origem=&tipo=&data=YYYY-MM-DD
router.get('/', async (req, res, next) => {
  try {
    const { mes, ano, segmento, origem, tipo, data } = req.query;
    const where = [];
    const params = [];

    if (data) {
      params.push(data);
      where.push(`data = $${params.length}`);
    } else if (mes && ano) {
      params.push(Number(ano), Number(mes));
      where.push(`EXTRACT(YEAR FROM data) = $${params.length - 1} AND EXTRACT(MONTH FROM data) = $${params.length}`);
    }
    if (segmento) { params.push(segmento); where.push(`segmento = $${params.length}`); }
    if (origem) { params.push(origem); where.push(`origem = $${params.length}`); }
    if (tipo) { params.push(tipo); where.push(`tipo = $${params.length}`); }

    const sql = `
      SELECT * FROM (${UNIAO_ORIGENS}) AS itens
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY data ASC
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
