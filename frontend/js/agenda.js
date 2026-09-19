const ROTULOS_TIPO_AGENDA = { compromisso: 'Compromisso', reuniao: 'Reunião', evento: 'Evento' };

function detectarConflitos(itens) {
  const chaves = new Map();
  for (const item of itens) {
    if (!item.hora) continue;
    const chave = `${item.data.split('T')[0]}_${item.hora}`;
    if (!chaves.has(chave)) chaves.set(chave, []);
    chaves.get(chave).push(item.id);
  }
  const conflitantes = new Set();
  for (const ids of chaves.values()) {
    if (ids.length > 1) ids.forEach((id) => conflitantes.add(id));
  }
  return conflitantes;
}

function renderItem(item, conflitantes) {
  const etapaTag = item.etapa_infantil ? `<span class="tag">${ROTULOS_ETAPA_INFANTIL[item.etapa_infantil]}</span>` : '';
  return `
    <div class="tarefa-item ${conflitantes.has(item.id) ? 'atrasada' : ''}" data-id="${item.id}">
      <div class="tarefa-info">
        <div class="tarefa-titulo">${escapeHtml(item.titulo)} ${conflitantes.has(item.id) ? '⚠️ conflito' : ''}</div>
        <div class="tarefa-meta">
          <span class="tag">${ROTULOS_TIPO_AGENDA[item.tipo]}</span>
          <span class="tag">${ROTULOS_SEGMENTO[item.segmento]}</span>
          ${etapaTag}
          <span>📅 ${formatarData(item.data)}${item.hora ? ` às ${item.hora.slice(0, 5)}` : ''}</span>
          ${item.local ? `<span>📍 ${escapeHtml(item.local)}</span>` : ''}
          ${item.recorrencia ? `<span>🔁 ${item.recorrencia}</span>` : ''}
        </div>
      </div>
      <div class="tarefa-acoes"><button class="btn-icone" onclick="abrirEdicao(${item.id})">✏️</button></div>
    </div>
  `;
}

async function carregarResumo() {
  const resumo = await apiGet('/agenda/resumo');
  document.getElementById('resumo-compromisso').textContent = resumo.compromisso || 0;
  document.getElementById('resumo-reuniao').textContent = resumo.reuniao || 0;
  document.getElementById('resumo-evento').textContent = resumo.evento || 0;
}

async function carregarLista() {
  const periodo = document.getElementById('filtro-periodo').value;
  const qs = montarQueryDosFiltros([
    { id: 'filtro-tipo', campo: 'tipo' },
    { id: 'filtro-segmento', campo: 'segmento' },
  ]);
  const itens = periodo
    ? await apiGet(`/agenda/periodo/${periodo}${qs ? `?${qs}` : ''}`)
    : await apiGet(`/agenda${qs ? `?${qs}` : ''}`);
  const conflitantes = detectarConflitos(itens);
  document.getElementById('lista-agenda').innerHTML = itens.length
    ? itens.map((i) => renderItem(i, conflitantes)).join('')
    : '<p style="color:var(--texto-suave)">Nenhum item encontrado.</p>';
  carregarResumo();
}

function abrirModal(item = null) {
  document.getElementById('modal-titulo').textContent = item ? 'Editar compromisso' : 'Novo compromisso';
  document.getElementById('campo-id').value = item ? item.id : '';
  document.getElementById('campo-titulo').value = item ? item.titulo : '';
  document.getElementById('campo-tipo').value = item ? item.tipo : 'compromisso';
  document.getElementById('campo-data').value = item ? item.data.split('T')[0] : '';
  document.getElementById('campo-hora').value = item && item.hora ? item.hora.slice(0, 5) : '';
  document.getElementById('campo-local').value = item ? (item.local || '') : '';
  document.getElementById('campo-segmento').value = item ? item.segmento : 'geral';
  document.getElementById('campo-etapa-infantil').value = item ? (item.etapa_infantil || '') : '';
  document.getElementById('campo-recorrencia').value = item ? (item.recorrencia || '') : '';
  document.getElementById('campo-observacoes').value = item ? (item.observacoes || '') : '';
  document.getElementById('btn-excluir').classList.toggle('oculto', !item);
  atualizarEtapaInfantil();
  document.getElementById('modal').classList.remove('oculto');
}

function atualizarEtapaInfantil() {
  document.getElementById('grupo-etapa-infantil').classList.toggle('oculto', document.getElementById('campo-segmento').value !== 'infantil');
}

async function abrirEdicao(id) {
  abrirModal(await apiGet(`/agenda/${id}`));
}

document.getElementById('campo-segmento').addEventListener('change', atualizarEtapaInfantil);
document.getElementById('btn-novo').addEventListener('click', () => abrirModal());
document.getElementById('btn-cancelar').addEventListener('click', () => document.getElementById('modal').classList.add('oculto'));

document.getElementById('btn-salvar').addEventListener('click', async () => {
  const dados = {
    titulo: document.getElementById('campo-titulo').value.trim(),
    tipo: document.getElementById('campo-tipo').value,
    data: document.getElementById('campo-data').value,
    hora: document.getElementById('campo-hora').value || null,
    local: document.getElementById('campo-local').value || null,
    segmento: document.getElementById('campo-segmento').value,
    etapa_infantil: document.getElementById('campo-segmento').value === 'infantil' ? (document.getElementById('campo-etapa-infantil').value || null) : null,
    recorrencia: document.getElementById('campo-recorrencia').value || null,
    observacoes: document.getElementById('campo-observacoes').value || null,
  };
  if (!dados.titulo || !dados.data) { alert('Título e data são obrigatórios.'); return; }
  const id = document.getElementById('campo-id').value;
  if (id) await apiPut(`/agenda/${id}`, dados); else await apiPost('/agenda', dados);
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});

document.getElementById('btn-excluir').addEventListener('click', async () => {
  const id = document.getElementById('campo-id').value;
  if (!confirm('Excluir este item?')) return;
  await apiDelete(`/agenda/${id}`);
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});

['filtro-periodo', 'filtro-tipo', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', carregarLista));

checarStatusNuvem();
carregarLista();
