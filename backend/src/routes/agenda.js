const express = require('express');
const { pool } = require('../db');
const { createCrudRouter } = require('../crudFactory');

const campos = ['titulo', 'tipo', 'data', 'hora', 'local', 'observacoes', 'segmento', 'etapa_infantil', 'recorrencia'];
const router = createCrudRouter({
  table: 'agenda_itens',
  campos,
  obrigatorios: ['titulo', 'data'],
  ordenarPor: 'data ASC, hora ASC NULLS LAST',
  campoResumo: 'tipo',
});

// GET /api/agenda/periodo?filtro=hoje|proximos|semana|7dias
router.get('/periodo/:filtro', async (req, res, next) => {
  try {
    const condicoes = {
      hoje: `data = CURRENT_DATE`,
      proximos: `data >= CURRENT_DATE`,
      semana: `date_trunc('week', data) = date_trunc('week', CURRENT_DATE)`,
      '7dias': `data BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`,
    };
    const cond = condicoes[req.params.filtro];
    if (!cond) return res.status(400).json({ erro: 'Filtro inválido' });
    const where = [cond];
    const params = [];
    if (req.query.tipo) { params.push(req.query.tipo); where.push(`tipo = $${params.length}`); }
    if (req.query.segmento) { params.push(req.query.segmento); where.push(`segmento = $${params.length}`); }
    const { rows } = await pool.query(
      `SELECT * FROM agenda_itens WHERE ${where.join(' AND ')} ORDER BY data ASC, hora ASC NULLS LAST`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
