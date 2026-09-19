function cardsDe(obj, rotulos) {
  return Object.entries(rotulos).map(([chave, rotulo]) => `
    <div class="resumo-card"><div class="numero">${obj[chave] ?? 0}</div><div class="rotulo">${rotulo}</div></div>
  `).join('');
}

async function carregar() {
  const qs = montarQueryDosFiltros([{ id: 'filtro-periodo', campo: 'periodo' }, { id: 'filtro-segmento', campo: 'segmento' }]);
  const [c, destaques] = await Promise.all([
    apiGet(`/relatorios/consolidado${qs ? `?${qs}` : ''}`),
    apiGet('/relatorios/destaques'),
  ]);

  document.getElementById('rel-tarefas').innerHTML = cardsDe(c.tarefas, {
    abertas: 'Abertas', concluidas: 'Concluídas', a_fazer: 'A fazer', em_andamento: 'Em andamento', aguardando: 'Aguardando',
  });
  document.getElementById('rel-conteudo').innerHTML = cardsDe(c.conteudo, {
    ativos: 'Ativos', ideias: 'Ideias', producao: 'Produção', aprovacao: 'Aprovação', programados: 'Programados', publicados: 'Publicados',
  });
  document.getElementById('rel-campanhas').innerHTML = `
    <div class="resumo-card"><div class="numero">${c.campanhas.ativas}</div><div class="rotulo">Ativas</div></div>
    <div class="resumo-card"><div class="numero">${formatarMoeda(c.campanhas.investimento)}</div><div class="rotulo">Investimento</div></div>
    <div class="resumo-card"><div class="numero">${c.campanhas.leads}</div><div class="rotulo">Leads</div></div>
    <div class="resumo-card"><div class="numero">${c.campanhas.conversoes}</div><div class="rotulo">Conversões</div></div>
  `;
  document.getElementById('rel-projetos').innerHTML = cardsDe(c.projetos, {
    ativos: 'Ativos', em_andamento: 'Em andamento', pausados: 'Pausados', concluidos: 'Concluídos', progresso_medio: 'Progresso médio (%)',
  });
  document.getElementById('rel-agenda').innerHTML = cardsDe(c.agenda_futura, {
    proximos_eventos: 'Próximos eventos', proximos_prazos: 'Próximos prazos',
  });
  document.getElementById('rel-instagram').innerHTML = cardsDe(c.instagram, {
    conteudos: 'Conteúdos', alcance: 'Alcance', engajamentos: 'Engajamentos',
  });

  const partes = [];
  if (destaques.melhor_conteudo_instagram) {
    const m = destaques.melhor_conteudo_instagram;
    partes.push(`<div class="secao" style="margin-bottom:8px;padding:12px;"><strong>📷 Melhor conteúdo do Instagram:</strong> ${escapeHtml(m.titulo)} (${m.engajamento} engajamentos)</div>`);
  }
  if (destaques.campanha_em_evidencia) {
    partes.push(`<div class="secao" style="margin-bottom:8px;padding:12px;"><strong>📣 Campanha em evidência:</strong> ${escapeHtml(destaques.campanha_em_evidencia.nome)}</div>`);
  }
  if (destaques.projeto_mais_avancado) {
    partes.push(`<div class="secao" style="margin-bottom:8px;padding:12px;"><strong>📁 Projeto mais avançado:</strong> ${escapeHtml(destaques.projeto_mais_avancado.nome)} (${destaques.projeto_mais_avancado.progresso}%)</div>`);
  }
  document.getElementById('rel-destaques').innerHTML = partes.join('') || '<p style="color:var(--texto-suave)">Sem dados suficientes ainda para destaques.</p>';
}

['filtro-periodo', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', carregar));

checarStatusNuvem();
carregar();
