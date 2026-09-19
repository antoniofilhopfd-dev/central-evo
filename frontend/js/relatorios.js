function cardsDe(obj, rotulos) {
  return Object.entries(rotulos).map(([chave, rotulo]) => `
    <div class="resumo-card"><div class="numero">${obj[chave] ?? 0}</div><div class="rotulo">${rotulo}</div></div>
  `).join('');
}

function montarQueryRelatorio() {
  const periodo = document.getElementById('filtro-periodo').value;
  const segmento = document.getElementById('filtro-segmento').value;
  const params = new URLSearchParams();
  if (periodo) params.set('periodo', periodo);
  if (segmento) params.set('segmento', segmento);
  if (periodo === 'custom') {
    params.set('inicio', document.getElementById('filtro-inicio').value);
    params.set('fim', document.getElementById('filtro-fim').value);
  }
  return params.toString();
}

function rotuloPeriodoAtual() {
  const periodo = document.getElementById('filtro-periodo').value;
  if (periodo === '7') return 'Últimos 7 dias';
  if (periodo === '30') return 'Últimos 30 dias';
  if (periodo === 'custom') {
    const ini = document.getElementById('filtro-inicio').value;
    const fim = document.getElementById('filtro-fim').value;
    return ini && fim ? `${formatarData(ini)} a ${formatarData(fim)}` : 'Personalizado';
  }
  return 'Todo o período';
}

let ultimoConsolidado = null;

async function carregar() {
  document.getElementById('filtro-inicio').classList.toggle('oculto', document.getElementById('filtro-periodo').value !== 'custom');
  document.getElementById('filtro-fim').classList.toggle('oculto', document.getElementById('filtro-periodo').value !== 'custom');

  const qs = montarQueryRelatorio();
  const c = await apiGet(`/relatorios/consolidado${qs ? `?${qs}` : ''}`);
  ultimoConsolidado = c;

  document.getElementById('rel-tarefas').innerHTML = cardsDe(c.tarefas, {
    abertas: 'Abertas', concluidas: 'Concluídas', a_fazer: 'A fazer', em_andamento: 'Em andamento', aguardando: 'Aguardando',
  });
  document.getElementById('rel-agenda').innerHTML = cardsDe(c.agenda_futura, {
    proximos_compromissos: 'Próximos compromissos', proximos_prazos: 'Próximos prazos',
  });

  document.getElementById('periodo-impressao').textContent =
    `Período: ${rotuloPeriodoAtual()} · Gerado em ${new Date().toLocaleString('pt-BR')}`;
}

const CAMPOS_EXECUTIVOS = {
  'campo-resumo-executivo': 'relatorio_resumo_executivo',
  'campo-decisoes': 'relatorio_decisoes',
  'campo-obs-relatorio': 'relatorio_observacoes',
  'campo-proximos-passos': 'relatorio_proximos_passos',
};
for (const [idCampo, chave] of Object.entries(CAMPOS_EXECUTIVOS)) {
  const el = document.getElementById(idCampo);
  try { el.value = localStorage.getItem(chave) || ''; } catch (e) { /* ambiente sem localStorage */ }
  el.addEventListener('input', () => {
    try { localStorage.setItem(chave, el.value); } catch (e) { /* ignora se indisponível */ }
  });
}

function linhaCSV(campos) {
  return campos.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
}

document.getElementById('btn-csv').addEventListener('click', () => {
  if (!ultimoConsolidado) return;
  const linhas = [
    linhaCSV(['Relatório Central Evolução']),
    linhaCSV(['Período', rotuloPeriodoAtual()]),
    linhaCSV(['Gerado em', new Date().toLocaleString('pt-BR')]),
    linhaCSV([]),
    linhaCSV(['Tarefas']),
    linhaCSV(['Abertas', 'Concluídas', 'A fazer', 'Em andamento', 'Aguardando']),
    linhaCSV(Object.values(ultimoConsolidado.tarefas)),
    linhaCSV([]),
    linhaCSV(['Agenda futura']),
    linhaCSV(['Próximos compromissos', 'Próximos prazos']),
    linhaCSV(Object.values(ultimoConsolidado.agenda_futura)),
    linhaCSV([]),
    linhaCSV(['Resumo executivo', document.getElementById('campo-resumo-executivo').value]),
    linhaCSV(['Decisões tomadas', document.getElementById('campo-decisoes').value]),
    linhaCSV(['Observações', document.getElementById('campo-obs-relatorio').value]),
    linhaCSV(['Próximos passos', document.getElementById('campo-proximos-passos').value]),
  ];
  const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `relatorio-central-evolucao-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
});

document.getElementById('btn-xlsx').addEventListener('click', async () => {
  if (!ultimoConsolidado) return;
  const [tarefas, agenda, arquivos] = await Promise.all([
    apiGet('/tarefas'), apiGet('/agenda'), apiGet('/arquivos'),
  ]);

  const wb = XLSX.utils.book_new();

  const wsResumo = XLSX.utils.aoa_to_sheet([
    ['Relatório Central Evolução'],
    ['Período', rotuloPeriodoAtual()],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    [],
    ['Tarefas — Abertas', ultimoConsolidado.tarefas.abertas],
    ['Tarefas — Concluídas', ultimoConsolidado.tarefas.concluidas],
    ['Tarefas — A fazer', ultimoConsolidado.tarefas.a_fazer],
    ['Tarefas — Em andamento', ultimoConsolidado.tarefas.em_andamento],
    ['Tarefas — Aguardando', ultimoConsolidado.tarefas.aguardando],
    ['Agenda — Próximos compromissos', ultimoConsolidado.agenda_futura.proximos_compromissos],
    ['Agenda — Próximos prazos', ultimoConsolidado.agenda_futura.proximos_prazos],
    [],
    ['Resumo executivo', document.getElementById('campo-resumo-executivo').value],
    ['Decisões tomadas', document.getElementById('campo-decisoes').value],
    ['Observações', document.getElementById('campo-obs-relatorio').value],
    ['Próximos passos', document.getElementById('campo-proximos-passos').value],
  ]);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  const wsTarefas = XLSX.utils.json_to_sheet(tarefas.map((t) => ({
    Título: t.titulo, Status: t.status, Prioridade: t.prioridade, Segmento: t.segmento,
    Prazo: t.prazo ? t.prazo.split('T')[0] : '', Responsável: t.responsavel || '',
  })));
  XLSX.utils.book_append_sheet(wb, wsTarefas, 'Tarefas');

  const wsAgenda = XLSX.utils.json_to_sheet(agenda.map((a) => ({
    Título: a.titulo, Tipo: a.tipo, Data: a.data.split('T')[0], Hora: a.hora || '', Local: a.local || '', Segmento: a.segmento,
  })));
  XLSX.utils.book_append_sheet(wb, wsAgenda, 'Agenda');

  const wsArquivos = XLSX.utils.json_to_sheet(arquivos.map((a) => ({
    Nome: a.nome, Categoria: a.tipo, Segmento: a.segmento, Link: a.link, Favorito: a.favorito ? 'Sim' : 'Não', Usos: a.usos,
  })));
  XLSX.utils.book_append_sheet(wb, wsArquivos, 'Arquivos');

  const wsIndicadores = XLSX.utils.aoa_to_sheet([
    ['Indicador', 'Valor'],
    ['Total de tarefas cadastradas', tarefas.length],
    ['% tarefas concluídas', tarefas.length ? `${Math.round((ultimoConsolidado.tarefas.concluidas / tarefas.length) * 100)}%` : '0%'],
    ['Total de itens na Agenda', agenda.length],
    ['Total de arquivos/links', arquivos.length],
    ['Arquivos favoritos', arquivos.filter((a) => a.favorito).length],
  ]);
  XLSX.utils.book_append_sheet(wb, wsIndicadores, 'Indicadores');

  XLSX.writeFile(wb, `relatorio-central-evolucao-${new Date().toISOString().split('T')[0]}.xlsx`);
});

['filtro-periodo', 'filtro-segmento', 'filtro-inicio', 'filtro-fim'].forEach((id) => document.getElementById(id).addEventListener('change', carregar));

checarStatusNuvem();
carregar();
