const { pool } = require('../db');
const { createCrudRouter } = require('../crudFactory');

const campos = [
  'titulo', 'etapa', 'tipo', 'segmento', 'etapa_infantil', 'data_publicacao',
  'briefing', 'link', 'observacoes', 'cta', 'objetivo', 'checklist',
  'evento_id', 'campanha_id', 'projeto_id', 'instagram_conteudo_id',
];
const router = createCrudRouter({
  table: 'conteudos',
  campos,
  obrigatorios: ['titulo'],
  ordenarPor: 'ordem_kanban ASC, criado_em DESC',
  campoResumo: 'etapa',
});

router.put('/:id/ordem', async (req, res, next) => {
  try {
    const { ordem_kanban, etapa } = req.body;
    const { rows } = await pool.query(
      `UPDATE conteudos SET ordem_kanban = $1, etapa = COALESCE($2, etapa), atualizado_em = now()
       WHERE id = $3 RETURNING *`,
      [ordem_kanban, etapa || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/duplicar', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM conteudos WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Não encontrado' });
    const c = rows[0];
    const { rows: novo } = await pool.query(
      `INSERT INTO conteudos (titulo, etapa, tipo, segmento, etapa_infantil, briefing, link, observacoes, cta, objetivo, evento_id, campanha_id, projeto_id)
       VALUES ($1, 'ideia', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [`${c.titulo} (cópia)`, c.tipo, c.segmento, c.etapa_infantil, c.briefing, c.link, c.observacoes, c.cta, c.objetivo, c.evento_id, c.campanha_id, c.projeto_id]
    );
    res.status(201).json(novo[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
