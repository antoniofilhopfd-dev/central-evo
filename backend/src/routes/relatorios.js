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

    const [tarefas, conteudo, campanhas, projetos, agendaFutura, instagramResumo] = await Promise.all([
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
          COUNT(*) FILTER (WHERE etapa <> 'publicado')::int AS ativos,
          COUNT(*) FILTER (WHERE etapa = 'ideia')::int AS ideias,
          COUNT(*) FILTER (WHERE etapa = 'producao')::int AS producao,
          COUNT(*) FILTER (WHERE etapa = 'aprovacao')::int AS aprovacao,
          COUNT(*) FILTER (WHERE etapa = 'programado')::int AS programados,
          COUNT(*) FILTER (WHERE etapa = 'publicado')::int AS publicados
        FROM conteudos WHERE ${condicaoPeriodo(periodo)} ${filtroSeg}
      `, [segmentoParam]),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'ativa')::int AS ativas,
          COALESCE(SUM(valor_investido), 0)::float AS investimento,
          COALESCE(SUM(leads), 0)::int AS leads,
          COALESCE(SUM(conversoes), 0)::int AS conversoes
        FROM campanhas WHERE ${condicaoPeriodo(periodo)} ${filtroSeg}
      `, [segmentoParam]),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status <> 'concluido')::int AS ativos,
          COUNT(*) FILTER (WHERE status = 'em_andamento')::int AS em_andamento,
          COUNT(*) FILTER (WHERE status = 'pausado')::int AS pausados,
          COUNT(*) FILTER (WHERE status = 'concluido')::int AS concluidos,
          COALESCE(ROUND(AVG(progresso)), 0)::int AS progresso_medio
        FROM projetos WHERE ${condicaoPeriodo(periodo)} ${filtroSeg}
      `, [segmentoParam]),
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM eventos WHERE data >= CURRENT_DATE) AS proximos_eventos,
          (SELECT COUNT(*)::int FROM tarefas WHERE prazo >= CURRENT_DATE AND status <> 'concluida') AS proximos_prazos
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS conteudos,
          COALESCE(SUM(alcance), 0)::int AS alcance,
          COALESCE(SUM(curtidas + comentarios + compartilhamentos + salvamentos), 0)::int AS engajamentos
        FROM instagram_conteudos WHERE ${condicaoPeriodo(periodo, 'data')}
      `),
    ]);

    res.json({
      tarefas: tarefas.rows[0],
      conteudo: conteudo.rows[0],
      campanhas: campanhas.rows[0],
      projetos: projetos.rows[0],
      agenda_futura: agendaFutura.rows[0],
      instagram: instagramResumo.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

router.get('/destaques', async (req, res, next) => {
  try {
    const [melhorPost, campanhaEvidencia, projetoAvancado] = await Promise.all([
      pool.query(`
        SELECT *, (curtidas + comentarios + compartilhamentos + salvamentos) AS engajamento
        FROM instagram_conteudos ORDER BY engajamento DESC LIMIT 1
      `),
      pool.query(`SELECT * FROM campanhas WHERE status = 'ativa' ORDER BY valor_investido DESC LIMIT 1`),
      pool.query(`SELECT * FROM projetos WHERE status = 'em_andamento' ORDER BY progresso DESC LIMIT 1`),
    ]);
    res.json({
      melhor_conteudo_instagram: melhorPost.rows[0] || null,
      campanha_em_evidencia: campanhaEvidencia.rows[0] || null,
      projeto_mais_avancado: projetoAvancado.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
