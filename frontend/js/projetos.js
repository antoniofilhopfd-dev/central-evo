const ROTULOS_STATUS_PROJETO = { planejamento: 'Planejamento', em_andamento: 'Em andamento', pausado: 'Pausado', concluido: 'Concluído' };
let projetoEmEdicao = null;

function renderProjeto(p) {
  return `
    <div class="secao" style="margin-bottom:0;padding:14px;" data-id="${p.id}">
      <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;">
        <div style="flex:1;min-width:200px;">
          <strong>${p.nome}</strong>
          <div class="tarefa-meta" style="margin-top:4px;">
            <span class="tag">${ROTULOS_STATUS_PROJETO[p.status]}</span>
            <span class="tag">Prioridade: ${p.prioridade}</span>
            <span class="tag">${ROTULOS_SEGMENTO[p.segmento]}</span>
            ${p.prazo_final ? `<span>📅 até ${formatarData(p.prazo_final)}</span>` : ''}
          </div>
          ${p.proximo_passo ? `<div style="margin-top:6px;font-size:0.82rem;">➡️ Próximo passo: ${p.proximo_passo}</div>` : ''}
        </div>
        <div class="tarefa-acoes"><button class="btn-icone" onclick="abrirEdicao(${p.id})">✏️</button></div>
      </div>
      <div style="margin-top:10px;background:var(--cinza-borda);border-radius:6px;height:10px;overflow:hidden;">
        <div style="width:${p.progresso}%;background:var(--azul);height:100%;"></div>
      </div>
      <div style="font-size:0.72rem;color:var(--texto-suave);margin-top:2px;">${p.progresso}% concluído${p.milestones && p.milestones.length ? ` (${p.milestones.filter((m) => m.concluido).length}/${p.milestones.length} marcos)` : ''}</div>
    </div>
  `;
}

async function carregarResumo() {
  const resumo = await apiGet('/projetos/resumo');
  for (const status of Object.keys(ROTULOS_STATUS_PROJETO)) {
    document.getElementById(`resumo-${status}`).textContent = resumo[status] || 0;
  }
}

async function carregarLista() {
  const qs = montarQueryDosFiltros([
    { id: 'filtro-status', campo: 'status' }, { id: 'filtro-prioridade', campo: 'prioridade' }, { id: 'filtro-segmento', campo: 'segmento' },
  ]);
  const itens = await apiGet(`/projetos${qs ? `?${qs}` : ''}`);
  document.getElementById('lista-projetos').innerHTML = itens.length
    ? itens.map(renderProjeto).join('')
    : '<p style="color:var(--texto-suave)">Nenhum projeto encontrado.</p>';
  carregarResumo();
}

function renderMilestones() {
  const lista = document.getElementById('lista-milestones');
  const milestones = (projetoEmEdicao && projetoEmEdicao.milestones) || [];
  lista.innerHTML = milestones.map((m) => `
    <div style="display:flex;align-items:center;gap:8px;font-size:0.85rem;">
      <input type="checkbox" ${m.concluido ? 'checked' : ''} onchange="toggleMilestone(${m.id}, this.checked)">
      <span style="flex:1;${m.concluido ? 'text-decoration:line-through;color:var(--texto-suave);' : ''}">${m.titulo}</span>
      <button class="btn-icone" onclick="removerMilestone(${m.id})">✕</button>
    </div>
  `).join('') || '<p style="font-size:0.8rem;color:var(--texto-suave)">Nenhum marco ainda.</p>';
}

async function toggleMilestone(id, concluido) {
  await apiPut(`/projetos/milestones/${id}`, { concluido });
  projetoEmEdicao = await apiGet(`/projetos/${projetoEmEdicao.id}`);
  renderMilestones();
}
async function removerMilestone(id) {
  await apiDelete(`/projetos/milestones/${id}`);
  projetoEmEdicao = await apiGet(`/projetos/${projetoEmEdicao.id}`);
  renderMilestones();
}

document.getElementById('btn-add-milestone').addEventListener('click', async () => {
  const input = document.getElementById('novo-milestone');
  if (!input.value.trim()) return;
  await apiPost(`/projetos/${projetoEmEdicao.id}/milestones`, { titulo: input.value.trim() });
  input.value = '';
  projetoEmEdicao = await apiGet(`/projetos/${projetoEmEdicao.id}`);
  renderMilestones();
});

function abrirModal(p = null) {
  projetoEmEdicao = p;
  document.getElementById('modal-titulo').textContent = p ? 'Editar projeto' : 'Novo projeto';
  document.getElementById('campo-id').value = p ? p.id : '';
  document.getElementById('campo-nome').value = p ? p.nome : '';
  document.getElementById('campo-status').value = p ? p.status : 'planejamento';
  document.getElementById('campo-prioridade').value = p ? p.prioridade : 'normal';
  document.getElementById('campo-segmento').value = p ? p.segmento : 'geral';
  document.getElementById('campo-inicio').value = p && p.inicio ? p.inicio.split('T')[0] : '';
  document.getElementById('campo-prazo-final').value = p && p.prazo_final ? p.prazo_final.split('T')[0] : '';
  document.getElementById('campo-progresso').value = p ? p.progresso : 0;
  document.getElementById('campo-objetivo').value = p ? (p.objetivo || '') : '';
  document.getElementById('campo-proximo-passo').value = p ? (p.proximo_passo || '') : '';
  document.getElementById('campo-links').value = p ? (p.links_importantes || '') : '';
  document.getElementById('campo-observacoes').value = p ? (p.observacoes || '') : '';
  document.getElementById('btn-excluir').classList.toggle('oculto', !p);
  document.getElementById('btn-duplicar').classList.toggle('oculto', !p);
  document.getElementById('grupo-milestones').style.display = p ? 'block' : 'none';
  if (p) renderMilestones();
  document.getElementById('modal').classList.remove('oculto');
}

async function abrirEdicao(id) {
  abrirModal(await apiGet(`/projetos/${id}`));
}

document.getElementById('btn-novo').addEventListener('click', () => abrirModal());
document.getElementById('btn-cancelar').addEventListener('click', () => document.getElementById('modal').classList.add('oculto'));

document.getElementById('btn-salvar').addEventListener('click', async () => {
  const dados = {
    nome: document.getElementById('campo-nome').value.trim(),
    status: document.getElementById('campo-status').value,
    prioridade: document.getElementById('campo-prioridade').value,
    segmento: document.getElementById('campo-segmento').value,
    inicio: document.getElementById('campo-inicio').value || null,
    prazo_final: document.getElementById('campo-prazo-final').value || null,
    progresso: document.getElementById('campo-progresso').value || 0,
    objetivo: document.getElementById('campo-objetivo').value || null,
    proximo_passo: document.getElementById('campo-proximo-passo').value || null,
    links_importantes: document.getElementById('campo-links').value || null,
    observacoes: document.getElementById('campo-observacoes').value || null,
  };
  if (!dados.nome) { alert('Informe um nome.'); return; }
  const id = document.getElementById('campo-id').value;
  if (id) await apiPut(`/projetos/${id}`, dados); else await apiPost('/projetos', dados);
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});

document.getElementById('btn-duplicar').addEventListener('click', async () => {
  await apiPost(`/projetos/${document.getElementById('campo-id').value}/duplicar`, {});
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});
document.getElementById('btn-excluir').addEventListener('click', async () => {
  const id = document.getElementById('campo-id').value;
  if (!confirm('Excluir este projeto?')) return;
  await apiDelete(`/projetos/${id}`);
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});

['filtro-status', 'filtro-prioridade', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', carregarLista));

checarStatusNuvem();
carregarLista();
