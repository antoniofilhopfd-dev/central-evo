function cardsDe(obj, rotulos) {
  return Object.entries(rotulos).map(([chave, rotulo]) => `
    <div class="resumo-card"><div class="numero">${obj[chave] ?? 0}</div><div class="rotulo">${rotulo}</div></div>
  `).join('');
}

async function carregar() {
  const qs = montarQueryDosFiltros([{ id: 'filtro-periodo', campo: 'periodo' }, { id: 'filtro-segmento', campo: 'segmento' }]);
  const c = await apiGet(`/relatorios/consolidado${qs ? `?${qs}` : ''}`);

  document.getElementById('rel-tarefas').innerHTML = cardsDe(c.tarefas, {
    abertas: 'Abertas', concluidas: 'Concluídas', a_fazer: 'A fazer', em_andamento: 'Em andamento', aguardando: 'Aguardando',
  });
  document.getElementById('rel-agenda').innerHTML = cardsDe(c.agenda_futura, {
    proximos_compromissos: 'Próximos compromissos', proximos_prazos: 'Próximos prazos',
  });
}

['filtro-periodo', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', carregar));

checarStatusNuvem();
carregar();
