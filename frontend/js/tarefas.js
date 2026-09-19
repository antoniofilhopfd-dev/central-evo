const ROTULOS_STATUS = { a_fazer: 'A fazer', em_andamento: 'Em andamento', aguardando: 'Aguardando', concluida: 'Concluída' };

let vistaAtual = 'lista';
let tarefaEmEdicao = null;

async function checarStatus() {
  try {
    const r = await fetch(`${API_BASE}/health`);
    const dados = await r.json();
    document.getElementById('ind-nuvem').className = dados.status === 'ok' ? 'bolinha ok' : 'bolinha erro';
  } catch (err) {
    document.getElementById('ind-nuvem').className = 'bolinha erro';
  }
}

function montarQuery() {
  const params = new URLSearchParams();
  const status = document.getElementById('filtro-status').value;
  const prioridade = document.getElementById('filtro-prioridade').value;
  const segmento = document.getElementById('filtro-segmento').value;
  const prazo = document.getElementById('filtro-prazo').value;
  if (status) params.set('status', status);
  if (prioridade) params.set('prioridade', prioridade);
  if (segmento) params.set('segmento', segmento);
  if (prazo) params.set('prazo', prazo);
  return params.toString();
}

function ehAtrasada(tarefa) {
  if (!tarefa.prazo || tarefa.status === 'concluida') return false;
  return new Date(tarefa.prazo) < new Date(new Date().toDateString());
}

function aplicarBusca(tarefas) {
  const termo = document.getElementById('busca-tarefa').value.trim().toLowerCase();
  if (!termo) return tarefas;
  return tarefas.filter((t) =>
    t.titulo.toLowerCase().includes(termo) || (t.observacoes || '').toLowerCase().includes(termo)
  );
}

function renderTarefaItem(tarefa) {
  const atrasada = ehAtrasada(tarefa);
  const etapaTag = tarefa.etapa_infantil ? `<span class="tag">${ROTULOS_ETAPA_INFANTIL[tarefa.etapa_infantil] || ''}</span>` : '';
  const subConcluidas = (tarefa.subtarefas || []).filter((s) => s.concluida).length;
  const subTotal = (tarefa.subtarefas || []).length;
  return `
    <div class="tarefa-item prioridade-${tarefa.prioridade} ${atrasada ? 'atrasada' : ''}" data-id="${tarefa.id}">
      <div class="tarefa-info">
        <div class="tarefa-titulo">${escapeHtml(tarefa.titulo)}</div>
        <div class="tarefa-meta">
          <span class="tag">${ROTULOS_STATUS[tarefa.status]}</span>
          <span class="tag">${ROTULOS_SEGMENTO[tarefa.segmento]}</span>
          ${etapaTag}
          ${tarefa.prazo ? `<span>${atrasada ? '⚠️' : '📅'} ${formatarData(tarefa.prazo)}</span>` : ''}
          ${tarefa.aguardando_de ? `<span>Aguardando: ${escapeHtml(tarefa.aguardando_de)}</span>` : ''}
          ${subTotal > 0 ? `<span>☑️ ${subConcluidas}/${subTotal}</span>` : ''}
        </div>
      </div>
      <div class="tarefa-acoes">
        <button class="btn-icone" onclick="abrirEdicao(${tarefa.id})" title="Editar">✏️</button>
      </div>
    </div>
  `;
}

async function carregarResumo() {
  const r = await fetch(`${API_BASE}/tarefas/resumo`);
  const resumo = await r.json();
  for (const status of Object.keys(resumo)) {
    const el = document.getElementById(`resumo-${status}`);
    if (el) el.textContent = resumo[status];
  }
}

async function carregarFoco() {
  const r = await fetch(`${API_BASE}/tarefas?status=`);
  const todas = await r.json();
  const abertas = todas.filter((t) => t.status !== 'concluida');
  const hero = document.getElementById('hero-foco');
  if (abertas.length === 0) { hero.classList.add('oculto'); return; }
  const ordemPrioridade = { alta: 0, normal: 1, baixa: 2 };
  abertas.sort((a, b) => {
    const pa = ordemPrioridade[a.prioridade], pb = ordemPrioridade[b.prioridade];
    if (pa !== pb) return pa - pb;
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo.localeCompare(b.prazo);
  });
  const foco = abertas[0];
  hero.classList.remove('oculto');
  hero.innerHTML = `
    <div>
      <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.75;">Foco agora</div>
      <div style="font-size:1.05rem;font-weight:700;margin:2px 0;">${escapeHtml(foco.titulo)}</div>
      <div style="font-size:0.8rem;opacity:0.85;">Prioridade ${foco.prioridade}${foco.prazo ? ` · prazo ${formatarData(foco.prazo)}` : ' · sem prazo'}</div>
    </div>
    <button class="btn-secundario" onclick="abrirEdicao(${foco.id})">Abrir tarefa</button>
  `;
}

async function carregarTarefas() {
  const qs = montarQuery();
  const r = await fetch(`${API_BASE}/tarefas${qs ? `?${qs}` : ''}`);
  let tarefas = await r.json();
  tarefas = aplicarBusca(tarefas);

  if (vistaAtual === 'lista') {
    const container = document.getElementById('lista-tarefas');
    container.innerHTML = tarefas.length
      ? tarefas.map(renderTarefaItem).join('')
      : '<p style="color:var(--texto-suave)">Nenhuma tarefa encontrada.</p>';
  } else {
    for (const status of Object.keys(ROTULOS_STATUS)) {
      document.getElementById(`kanban-${status}`).innerHTML = '';
    }
    tarefas.forEach((t) => {
      const col = document.getElementById(`kanban-${t.status}`);
      if (!col) return;
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.draggable = true;
      card.dataset.id = t.id;
      card.textContent = t.titulo;
      card.addEventListener('click', () => abrirEdicao(t.id));
      card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', t.id));
      col.appendChild(card);
    });
  }
  await carregarResumo();
  await carregarFoco();
}

document.querySelectorAll('.kanban-coluna').forEach((coluna) => {
  coluna.addEventListener('dragover', (e) => e.preventDefault());
  coluna.addEventListener('drop', async (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const novoStatus = coluna.dataset.status;
    await fetch(`${API_BASE}/tarefas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    });
    carregarTarefas();
  });
});

function renderSubtarefas() {
  const lista = document.getElementById('lista-subtarefas');
  const subs = (tarefaEmEdicao && tarefaEmEdicao.subtarefas) || [];
  lista.innerHTML = subs.map((s) => `
    <div style="display:flex;align-items:center;gap:8px;font-size:0.85rem;">
      <input type="checkbox" ${s.concluida ? 'checked' : ''} onchange="toggleSubtarefa(${s.id}, this.checked)">
      <span style="flex:1;${s.concluida ? 'text-decoration:line-through;color:var(--texto-suave);' : ''}">${escapeHtml(s.titulo)}</span>
      <button class="btn-icone" onclick="removerSubtarefa(${s.id})">✕</button>
    </div>
  `).join('') || '<p style="font-size:0.8rem;color:var(--texto-suave)">Nenhuma subtarefa ainda.</p>';
}

async function toggleSubtarefa(id, concluida) {
  await fetch(`${API_BASE}/tarefas/subtarefas/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ concluida }),
  });
  tarefaEmEdicao = await (await fetch(`${API_BASE}/tarefas/${tarefaEmEdicao.id}`)).json();
  renderSubtarefas();
}
async function removerSubtarefa(id) {
  await fetch(`${API_BASE}/tarefas/subtarefas/${id}`, { method: 'DELETE' });
  tarefaEmEdicao = await (await fetch(`${API_BASE}/tarefas/${tarefaEmEdicao.id}`)).json();
  renderSubtarefas();
}
document.getElementById('btn-add-subtarefa').addEventListener('click', async () => {
  const input = document.getElementById('nova-subtarefa');
  if (!input.value.trim()) return;
  await fetch(`${API_BASE}/tarefas/${tarefaEmEdicao.id}/subtarefas`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: input.value.trim() }),
  });
  input.value = '';
  tarefaEmEdicao = await (await fetch(`${API_BASE}/tarefas/${tarefaEmEdicao.id}`)).json();
  renderSubtarefas();
});

function abrirModal(tarefa = null) {
  tarefaEmEdicao = tarefa;
  document.getElementById('modal-titulo').textContent = tarefa ? 'Editar tarefa' : 'Nova tarefa';
  document.getElementById('campo-id').value = tarefa ? tarefa.id : '';
  document.getElementById('campo-titulo').value = tarefa ? tarefa.titulo : '';
  document.getElementById('campo-status').value = tarefa ? tarefa.status : 'a_fazer';
  document.getElementById('campo-prioridade').value = tarefa ? tarefa.prioridade : 'normal';
  document.getElementById('campo-segmento').value = tarefa ? tarefa.segmento : 'geral';
  document.getElementById('campo-etapa-infantil').value = tarefa ? (tarefa.etapa_infantil || '') : '';
  document.getElementById('campo-prazo').value = tarefa && tarefa.prazo ? tarefa.prazo.split('T')[0] : '';
  document.getElementById('campo-aguardando-de').value = tarefa ? (tarefa.aguardando_de || '') : '';
  document.getElementById('campo-responsavel').value = tarefa ? (tarefa.responsavel || '') : '';
  document.getElementById('campo-observacoes').value = tarefa ? (tarefa.observacoes || '') : '';
  document.getElementById('btn-excluir-tarefa').classList.toggle('oculto', !tarefa);
  document.getElementById('btn-duplicar-tarefa').classList.toggle('oculto', !tarefa);
  document.getElementById('grupo-subtarefas').classList.toggle('oculto', !tarefa);
  if (tarefa) renderSubtarefas();
  atualizarVisibilidadeEtapaInfantil();
  document.getElementById('modal-tarefa').classList.remove('oculto');
}

function atualizarVisibilidadeEtapaInfantil() {
  const segmento = document.getElementById('campo-segmento').value;
  document.getElementById('grupo-etapa-infantil').classList.toggle('oculto', segmento !== 'infantil');
}

async function abrirEdicao(id) {
  const r = await fetch(`${API_BASE}/tarefas/${id}`);
  const tarefa = await r.json();
  abrirModal(tarefa);
}

document.getElementById('campo-segmento').addEventListener('change', atualizarVisibilidadeEtapaInfantil);
document.getElementById('btn-nova-tarefa').addEventListener('click', () => abrirModal());
document.getElementById('btn-cancelar-modal').addEventListener('click', () => {
  document.getElementById('modal-tarefa').classList.add('oculto');
});

document.getElementById('btn-salvar-tarefa').addEventListener('click', async () => {
  const dados = {
    titulo: document.getElementById('campo-titulo').value.trim(),
    status: document.getElementById('campo-status').value,
    prioridade: document.getElementById('campo-prioridade').value,
    segmento: document.getElementById('campo-segmento').value,
    etapa_infantil: document.getElementById('campo-segmento').value === 'infantil'
      ? (document.getElementById('campo-etapa-infantil').value || null) : null,
    prazo: document.getElementById('campo-prazo').value || null,
    aguardando_de: document.getElementById('campo-aguardando-de').value || null,
    responsavel: document.getElementById('campo-responsavel').value || null,
    observacoes: document.getElementById('campo-observacoes').value || null,
  };
  if (!dados.titulo) { alert('Informe um título.'); return; }

  const id = document.getElementById('campo-id').value;
  const url = id ? `${API_BASE}/tarefas/${id}` : `${API_BASE}/tarefas`;
  const method = id ? 'PUT' : 'POST';
  await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });

  document.getElementById('modal-tarefa').classList.add('oculto');
  carregarTarefas();
});

document.getElementById('btn-excluir-tarefa').addEventListener('click', async () => {
  const id = document.getElementById('campo-id').value;
  if (!confirm('Excluir esta tarefa?')) return;
  await fetch(`${API_BASE}/tarefas/${id}`, { method: 'DELETE' });
  document.getElementById('modal-tarefa').classList.add('oculto');
  carregarTarefas();
});

document.getElementById('btn-duplicar-tarefa').addEventListener('click', async () => {
  const id = document.getElementById('campo-id').value;
  await fetch(`${API_BASE}/tarefas/${id}/duplicar`, { method: 'POST' });
  document.getElementById('modal-tarefa').classList.add('oculto');
  carregarTarefas();
});

['filtro-status', 'filtro-prioridade', 'filtro-segmento', 'filtro-prazo'].forEach((id) => {
  document.getElementById(id).addEventListener('change', carregarTarefas);
});
document.getElementById('busca-tarefa').addEventListener('input', carregarTarefas);

function marcarAba(ativa) {
  ['aba-hoje', 'aba-semana', 'aba-todas'].forEach((id) => document.getElementById(id).classList.toggle('ativo', id === ativa));
}
document.getElementById('aba-hoje').addEventListener('click', () => {
  marcarAba('aba-hoje'); document.getElementById('filtro-prazo').value = 'hoje'; carregarTarefas();
});
document.getElementById('aba-semana').addEventListener('click', () => {
  marcarAba('aba-semana'); document.getElementById('filtro-prazo').value = 'semana'; carregarTarefas();
});
document.getElementById('aba-todas').addEventListener('click', () => {
  marcarAba('aba-todas'); document.getElementById('filtro-prazo').value = ''; carregarTarefas();
});

document.getElementById('chip-atrasadas').addEventListener('click', () => {
  document.getElementById('filtro-prazo').value = 'atrasadas';
  marcarAba('');
  carregarTarefas();
});
document.getElementById('chip-alta').addEventListener('click', () => {
  document.getElementById('filtro-prioridade').value = 'alta';
  carregarTarefas();
});
document.getElementById('chip-mover-hoje').addEventListener('click', async () => {
  if (!confirm('Mover todas as tarefas atrasadas para hoje?')) return;
  await fetch(`${API_BASE}/tarefas/lote/mover-atrasadas?para=hoje`, { method: 'PUT' });
  carregarTarefas();
});
document.getElementById('chip-mover-amanha').addEventListener('click', async () => {
  if (!confirm('Mover todas as tarefas atrasadas para amanhã?')) return;
  await fetch(`${API_BASE}/tarefas/lote/mover-atrasadas?para=amanha`, { method: 'PUT' });
  carregarTarefas();
});
document.getElementById('chip-limpar-concluidas').addEventListener('click', async () => {
  if (!confirm('Remover as tarefas concluídas hoje? Essa ação não pode ser desfeita.')) return;
  await fetch(`${API_BASE}/tarefas/lote/concluidas-hoje`, { method: 'DELETE' });
  carregarTarefas();
});

document.getElementById('btn-vista-lista').addEventListener('click', () => {
  vistaAtual = 'lista';
  document.getElementById('btn-vista-lista').classList.add('ativo');
  document.getElementById('btn-vista-kanban').classList.remove('ativo');
  document.getElementById('vista-lista').classList.remove('oculto');
  document.getElementById('vista-kanban').classList.add('oculto');
  carregarTarefas();
});

document.getElementById('btn-vista-kanban').addEventListener('click', () => {
  vistaAtual = 'kanban';
  document.getElementById('btn-vista-kanban').classList.add('ativo');
  document.getElementById('btn-vista-lista').classList.remove('ativo');
  document.getElementById('vista-kanban').classList.remove('oculto');
  document.getElementById('vista-lista').classList.add('oculto');
  carregarTarefas();
});

checarStatus();
carregarTarefas();
