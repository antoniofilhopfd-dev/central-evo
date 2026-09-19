const { pool } = require('../db');
const { createCrudRouter } = require('../crudFactory');

const campos = [
  'nome', 'status', 'segmento', 'inicio', 'fim', 'objetivo', 'orcamento_previsto',
  'valor_investido', 'valor_conversao', 'leads', 'contatos', 'conversoes',
  'pecas_criativos', 'link_principal', 'observacoes', 'projeto_id',
];
const router = createCrudRouter({
  table: 'campanhas',
  campos,
  obrigatorios: ['nome'],
  ordenarPor: 'criado_em DESC',
  campoResumo: 'status',
});

router.get('/:id/conteudos', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM conteudos WHERE campanha_id = $1 ORDER BY criado_em DESC', [req.params.id]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/duplicar', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM campanhas WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Não encontrado' });
    const c = rows[0];
    const { rows: novo } = await pool.query(
      `INSERT INTO campanhas (nome, status, segmento, objetivo, orcamento_previsto, link_principal, observacoes, projeto_id)
       VALUES ($1, 'planejamento', $2, $3, $4, $5, $6, $7) RETURNING *`,
      [`${c.nome} (cópia)`, c.segmento, c.objetivo, c.orcamento_previsto, c.link_principal, c.observacoes, c.projeto_id]
    );
    res.status(201).json(novo[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
