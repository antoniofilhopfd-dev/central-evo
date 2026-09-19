const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const CAMPOS = [
  'titulo', 'status', 'prioridade', 'segmento', 'etapa_infantil',
  'prazo', 'aguardando_de', 'observacoes', 'responsavel', 'recorrencia',
];

function normalizeBody(body) {
  const out = {};
  for (const campo of CAMPOS) {
    if (body[campo] !== undefined) out[campo] = body[campo] === '' ? null : body[campo];
  }
  return out;
}

async function anexarSubtarefas(tarefas) {
  if (tarefas.length === 0) return tarefas;
  const ids = tarefas.map((t) => t.id);
  const { rows } = await pool.query(
    'SELECT * FROM tarefa_subtarefas WHERE tarefa_id = ANY($1) ORDER BY ordem ASC, id ASC',
    [ids]
  );
  const porTarefa = new Map();
  for (const sub of rows) {
    if (!porTarefa.has(sub.tarefa_id)) porTarefa.set(sub.tarefa_id, []);
    porTarefa.get(sub.tarefa_id).push(sub);
  }
  return tarefas.map((t) => ({ ...t, subtarefas: porTarefa.get(t.id) || [] }));
}

// GET /api/tarefas - lista com filtros
router.get('/', async (req, res, next) => {
  try {
    const { status, prioridade, segmento, prazo } = req.query;
    const where = [];
    const params = [];

    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (prioridade) {
      params.push(prioridade);
      where.push(`prioridade = $${params.length}`);
    }
    if (segmento) {
      params.push(segmento);
      where.push(`segmento = $${params.length}`);
    }
    if (prazo === 'hoje') {
      where.push(`prazo = CURRENT_DATE`);
    } else if (prazo === 'atrasadas') {
      where.push(`prazo < CURRENT_DATE AND status <> 'concluida'`);
    } else if (prazo === 'semana') {
      where.push(`prazo BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`);
    } else if (prazo === 'sem_prazo') {
      where.push(`prazo IS NULL`);
    }

    const sql = `
      SELECT * FROM tarefas
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ordem_kanban ASC, criado_em DESC
    `;
    const { rows } = await pool.query(sql, params);
    res.json(await anexarSubtarefas(rows));
  } catch (err) {
    next(err);
  }
});

// GET /api/tarefas/resumo - contagem por status
router.get('/resumo', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT status, COUNT(*)::int AS total FROM tarefas GROUP BY status
    `);
    const resumo = { a_fazer: 0, em_andamento: 0, aguardando: 0, concluida: 0 };
    for (const r of rows) resumo[r.status] = r.total;
    res.json(resumo);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tarefas/lote/mover-atrasadas?para=hoje|amanha
router.put('/lote/mover-atrasadas', async (req, res, next) => {
  try {
    const destino = req.query.para === 'amanha'
      ? `CURRENT_DATE + INTERVAL '1 day'`
      : `CURRENT_DATE`;
    const { rows } = await pool.query(`
      UPDATE tarefas SET prazo = ${destino}, atualizado_em = now()
      WHERE prazo < CURRENT_DATE AND status <> 'concluida'
      RETURNING id
    `);
    res.json({ atualizadas: rows.length });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tarefas/lote/concluidas-hoje
router.delete('/lote/concluidas-hoje', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      DELETE FROM tarefas WHERE status = 'concluida' AND atualizado_em::date = CURRENT_DATE RETURNING id
    `);
    res.json({ removidas: rows.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/tarefas/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tarefas WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Tarefa não encontrada' });
    const [tarefa] = await anexarSubtarefas(rows);
    res.json(tarefa);
  } catch (err) {
    next(err);
  }
});

// POST /api/tarefas
router.post('/', async (req, res, next) => {
  try {
    const dados = normalizeBody(req.body);
    if (!dados.titulo) return res.status(400).json({ erro: 'titulo é obrigatório' });

    const campos = Object.keys(dados);
    const valores = Object.values(dados);
    const placeholders = campos.map((_, i) => `$${i + 1}`).join(', ');

    const { rows } = await pool.query(
      `INSERT INTO tarefas (${campos.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      valores
    );
    res.status(201).json({ ...rows[0], subtarefas: [] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tarefas/:id
router.put('/:id', async (req, res, next) => {
  try {
    const dados = normalizeBody(req.body);
    const campos = Object.keys(dados);
    if (campos.length === 0) return res.status(400).json({ erro: 'Nenhum campo para atualizar' });

    const sets = campos.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const valores = Object.values(dados);
    valores.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE tarefas SET ${sets}, atualizado_em = now() WHERE id = $${valores.length} RETURNING *`,
      valores
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Tarefa não encontrada' });
    const [tarefa] = await anexarSubtarefas(rows);
    res.json(tarefa);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tarefas/:id/ordem - reordenar no Kanban
router.put('/:id/ordem', async (req, res, next) => {
  try {
    const { ordem_kanban, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE tarefas SET ordem_kanban = $1, status = COALESCE($2, status), atualizado_em = now()
       WHERE id = $3 RETURNING *`,
      [ordem_kanban, status || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Tarefa não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/tarefas/:id/duplicar
router.post('/:id/duplicar', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tarefas WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Tarefa não encontrada' });
    const t = rows[0];
    const { rows: novo } = await pool.query(
      `INSERT INTO tarefas (titulo, status, prioridade, segmento, etapa_infantil, prazo, aguardando_de, observacoes, responsavel, recorrencia)
       VALUES ($1, 'a_fazer', $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [`${t.titulo} (cópia)`, t.prioridade, t.segmento, t.etapa_infantil, t.prazo, t.aguardando_de, t.observacoes, t.responsavel, t.recorrencia]
    );
    res.status(201).json({ ...novo[0], subtarefas: [] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tarefas/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM tarefas WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ erro: 'Tarefa não encontrada' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /api/tarefas/:id/subtarefas
router.post('/:id/subtarefas', async (req, res, next) => {
  try {
    const { titulo } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'titulo é obrigatório' });
    const { rows } = await pool.query(
      `INSERT INTO tarefa_subtarefas (tarefa_id, titulo) VALUES ($1, $2) RETURNING *`,
      [req.params.id, titulo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tarefas/subtarefas/:subId
router.put('/subtarefas/:subId', async (req, res, next) => {
  try {
    const { concluida, titulo } = req.body;
    const { rows } = await pool.query(
      `UPDATE tarefa_subtarefas SET
         concluida = COALESCE($1, concluida),
         titulo = COALESCE($2, titulo)
       WHERE id = $3 RETURNING *`,
      [concluida ?? null, titulo ?? null, req.params.subId]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Subtarefa não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tarefas/subtarefas/:subId
router.delete('/subtarefas/:subId', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tarefa_subtarefas WHERE id = $1', [req.params.subId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
