const { pool } = require('../db');
const { createCrudRouter } = require('../crudFactory');

const campos = [
  'nome', 'status', 'segmento', 'etapa_infantil', 'data', 'hora', 'local', 'descricao',
  'etapa_divulgacao', 'etapa_foto', 'etapa_video', 'etapa_pos_evento', 'checklist',
  'link_principal', 'campanha_id', 'projeto_id',
];
const router = createCrudRouter({
  table: 'eventos',
  campos,
  obrigatorios: ['nome'],
  ordenarPor: 'data ASC NULLS LAST, criado_em DESC',
  campoResumo: 'status',
});

router.get('/:id/relacionados', async (req, res, next) => {
  try {
    const [conteudos, arquivos] = await Promise.all([
      pool.query('SELECT id, titulo, etapa FROM conteudos WHERE evento_id = $1', [req.params.id]),
      pool.query('SELECT id, nome, link FROM arquivos WHERE evento_id = $1', [req.params.id]),
    ]);
    res.json({ conteudos: conteudos.rows, arquivos: arquivos.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/duplicar', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM eventos WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Não encontrado' });
    const e = rows[0];
    const { rows: novo } = await pool.query(
      `INSERT INTO eventos (nome, status, segmento, etapa_infantil, local, descricao, link_principal, campanha_id, projeto_id)
       VALUES ($1, 'planejamento', $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [`${e.nome} (cópia)`, e.segmento, e.etapa_infantil, e.local, e.descricao, e.link_principal, e.campanha_id, e.projeto_id]
    );
    res.status(201).json(novo[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
