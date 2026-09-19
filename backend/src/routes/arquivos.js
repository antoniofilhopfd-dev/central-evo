const { pool } = require('../db');
const { createCrudRouter } = require('../crudFactory');

const campos = [
  'nome', 'tipo', 'segmento', 'link', 'descricao', 'palavras_chave',
  'importante', 'favorito',
];
const router = createCrudRouter({
  table: 'arquivos',
  campos,
  obrigatorios: ['nome', 'link'],
  ordenarPor: 'criado_em DESC',
  campoResumo: 'tipo',
});

router.get('/destaque/importantes', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM arquivos WHERE importante = true ORDER BY nome ASC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/destaque/mais-usados', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM arquivos WHERE usos > 0 ORDER BY usos DESC LIMIT 10');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/destaque/recentes', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM arquivos ORDER BY criado_em DESC LIMIT 10');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/abrir', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE arquivos SET usos = usos + 1, atualizado_em = now() WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
