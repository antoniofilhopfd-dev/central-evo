const express = require('express');
const { pool } = require('./db');

/**
 * Cria um router Express com CRUD padrão (list/get/post/put/delete) para uma
 * tabela, reduzindo a repetição entre os módulos que seguem o mesmo formato.
 * Comportamentos específicos de cada módulo são adicionados no próprio
 * arquivo de rotas, montando rotas extras no router retornado.
 *
 * @param {object} opts
 * @param {string} opts.table - nome da tabela
 * @param {string[]} opts.campos - colunas aceitas em POST/PUT
 * @param {string[]} opts.obrigatorios - subconjunto de `campos` exigido no POST
 * @param {string} [opts.ordenarPor] - cláusula ORDER BY (sem a palavra ORDER BY)
 * @param {string} [opts.campoResumo] - coluna usada para agrupar em GET /resumo
 * @param {boolean} [opts.incluirListagem=true] - false quando o módulo precisa
 *   sobrescrever GET / e GET /:id (ex.: para anexar sub-recursos)
 */
function createCrudRouter({ table, campos, obrigatorios = [], ordenarPor = 'criado_em DESC', campoResumo, incluirListagem = true }) {
  const router = express.Router();

  function normalizeBody(body) {
    const out = {};
    for (const campo of campos) {
      if (body[campo] !== undefined) out[campo] = body[campo] === '' ? null : body[campo];
    }
    return out;
  }

  if (incluirListagem) {
    router.get('/', async (req, res, next) => {
      try {
        const where = [];
        const params = [];
        for (const campo of campos) {
          if (req.query[campo] !== undefined && req.query[campo] !== '') {
            params.push(req.query[campo]);
            where.push(`${campo} = $${params.length}`);
          }
        }
        const sql = `SELECT * FROM ${table} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${ordenarPor}`;
        const { rows } = await pool.query(sql, params);
        res.json(rows);
      } catch (err) {
        next(err);
      }
    });
  }

  if (campoResumo) {
    router.get('/resumo', async (req, res, next) => {
      try {
        const { rows } = await pool.query(
          `SELECT ${campoResumo} AS chave, COUNT(*)::int AS total FROM ${table} GROUP BY ${campoResumo}`
        );
        const resumo = {};
        for (const r of rows) resumo[r.chave] = r.total;
        res.json(resumo);
      } catch (err) {
        next(err);
      }
    });
  }

  if (incluirListagem) {
    router.get('/:id', async (req, res, next) => {
      try {
        const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Não encontrado' });
        res.json(rows[0]);
      } catch (err) {
        next(err);
      }
    });
  }

  router.post('/', async (req, res, next) => {
    try {
      const dados = normalizeBody(req.body);
      for (const campo of obrigatorios) {
        if (!dados[campo]) return res.status(400).json({ erro: `${campo} é obrigatório` });
      }
      const chaves = Object.keys(dados);
      const valores = Object.values(dados);
      const placeholders = chaves.map((_, i) => `$${i + 1}`).join(', ');
      const sql = chaves.length
        ? `INSERT INTO ${table} (${chaves.join(', ')}) VALUES (${placeholders}) RETURNING *`
        : `INSERT INTO ${table} DEFAULT VALUES RETURNING *`;
      const { rows } = await pool.query(sql, valores);
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const dados = normalizeBody(req.body);
      const chaves = Object.keys(dados);
      if (chaves.length === 0) return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
      const sets = chaves.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const valores = Object.values(dados);
      valores.push(req.params.id);
      const temAtualizadoEm = campos.includes('atualizado_em') || true;
      const sql = `UPDATE ${table} SET ${sets}${temAtualizadoEm ? ', atualizado_em = now()' : ''} WHERE id = $${valores.length} RETURNING *`;
      const { rows } = await pool.query(sql, valores);
      if (rows.length === 0) return res.status(404).json({ erro: 'Não encontrado' });
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ erro: 'Não encontrado' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createCrudRouter };
