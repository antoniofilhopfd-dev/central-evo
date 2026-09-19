const express = require('express');
const { pool } = require('../db');
const { createCrudRouter } = require('../crudFactory');

const campos = [
  'nome', 'status', 'segmento', 'inicio', 'prazo_final', 'progresso',
  'prioridade', 'objetivo', 'proximo_passo', 'links_importantes', 'observacoes',
];
const router = createCrudRouter({
  table: 'projetos',
  campos,
  obrigatorios: ['nome'],
  ordenarPor: 'criado_em DESC',
  campoResumo: 'status',
  incluirListagem: false,
});

async function anexarMilestones(projetos) {
  if (projetos.length === 0) return projetos;
  const ids = projetos.map((p) => p.id);
  const { rows } = await pool.query(
    'SELECT * FROM projeto_milestones WHERE projeto_id = ANY($1) ORDER BY ordem ASC, id ASC',
    [ids]
  );
  const porProjeto = new Map();
  for (const m of rows) {
    if (!porProjeto.has(m.projeto_id)) porProjeto.set(m.projeto_id, []);
    porProjeto.get(m.projeto_id).push(m);
  }
  return projetos.map((p) => ({ ...p, milestones: porProjeto.get(p.id) || [] }));
}

async function recalcularProgresso(projetoId) {
  const { rows } = await pool.query('SELECT concluido FROM projeto_milestones WHERE projeto_id = $1', [projetoId]);
  if (rows.length === 0) return;
  const concluidos = rows.filter((r) => r.concluido).length;
  const progresso = Math.round((concluidos / rows.length) * 100);
  await pool.query('UPDATE projetos SET progresso = $1, atualizado_em = now() WHERE id = $2', [progresso, projetoId]);
}

// Sobrepõe GET / e GET /:id para incluir milestones
router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    for (const campo of ['status', 'segmento', 'prioridade']) {
      if (req.query[campo]) {
        params.push(req.query[campo]);
        where.push(`${campo} = $${params.length}`);
      }
    }
    const sql = `SELECT * FROM projetos ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY criado_em DESC`;
    const { rows } = await pool.query(sql, params);
    res.json(await anexarMilestones(rows));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projetos WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Não encontrado' });
    const [projeto] = await anexarMilestones(rows);
    res.json(projeto);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/milestones', async (req, res, next) => {
  try {
    const { titulo } = req.body;
    if (!titulo) return res.status(400).json({ erro: 'titulo é obrigatório' });
    const { rows } = await pool.query(
      'INSERT INTO projeto_milestones (projeto_id, titulo) VALUES ($1, $2) RETURNING *',
      [req.params.id, titulo]
    );
    await recalcularProgresso(req.params.id);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/milestones/:milestoneId', async (req, res, next) => {
  try {
    const { concluido, titulo } = req.body;
    const { rows } = await pool.query(
      `UPDATE projeto_milestones SET concluido = COALESCE($1, concluido), titulo = COALESCE($2, titulo)
       WHERE id = $3 RETURNING *`,
      [concluido ?? null, titulo ?? null, req.params.milestoneId]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Marco não encontrado' });
    await recalcularProgresso(rows[0].projeto_id);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/milestones/:milestoneId', async (req, res, next) => {
  try {
    const { rows } = await pool.query('DELETE FROM projeto_milestones WHERE id = $1 RETURNING projeto_id', [req.params.milestoneId]);
    if (rows.length) await recalcularProgresso(rows[0].projeto_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /api/projetos/:id/duplicar
router.post('/:id/duplicar', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projetos WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Não encontrado' });
    const p = rows[0];
    const { rows: novo } = await pool.query(
      `INSERT INTO projetos (nome, status, segmento, inicio, prazo_final, progresso, prioridade, objetivo, proximo_passo, links_importantes, observacoes)
       VALUES ($1, 'planejamento', $2, $3, $4, 0, $5, $6, $7, $8, $9) RETURNING *`,
      [`${p.nome} (cópia)`, p.segmento, p.inicio, p.prazo_final, p.prioridade, p.objetivo, p.proximo_passo, p.links_importantes, p.observacoes]
    );
    res.status(201).json(novo[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
