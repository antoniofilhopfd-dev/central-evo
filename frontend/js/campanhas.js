const ROTULOS_STATUS_CAMPANHA = { planejamento: 'Planejamento', ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' };

function calcularIndicadores(c) {
  const leads = Number(c.leads) || 0;
  const investido = Number(c.valor_investido) || 0;
  const conversoes = Number(c.conversoes) || 0;
  const valorConversao = Number(c.valor_conversao) || 0;
  return {
    cpl: leads > 0 ? investido / leads : 0,
    taxaConversao: leads > 0 ? (conversoes / leads) * 100 : 0,
    roas: investido > 0 ? valorConversao / investido : 0,
  };
}

function renderCampanha(c) {
  const ind = calcularIndicadores(c);
  const progresso = Number(c.orcamento_previsto) > 0 ? Math.min(100, Math.round((Number(c.valor_investido) / Number(c.orcamento_previsto)) * 100)) : 0;
  return `
    <div class="secao" style="margin-bottom:0;padding:14px;" data-id="${c.id}">
      <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;">
        <div>
          <strong>${escapeHtml(c.nome)}</strong>
          <div class="tarefa-meta" style="margin-top:4px;">
            <span class="tag">${ROTULOS_STATUS_CAMPANHA[c.status]}</span>
            <span class="tag">${ROTULOS_SEGMENTO[c.segmento]}</span>
            ${c.inicio ? `<span>📅 ${formatarData(c.inicio)}${c.fim ? ` – ${formatarData(c.fim)}` : ''}</span>` : ''}
          </div>
        </div>
        <div class="tarefa-acoes">
          ${c.link_principal ? `<a class="btn-icone" href="${escapeHtml(c.link_principal)}" target="_blank" rel="noopener noreferrer">🔗</a>` : ''}
          <button class="btn-icone" onclick="abrirEdicao(${c.id})">✏️</button>
        </div>
      </div>
      <div class="resumo-cards" style="margin-top:12px;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));">
        <div class="resumo-card"><div class="numero" style="font-size:1.1rem">${formatarMoeda(c.valor_investido)}</div><div class="rotulo">Investido</div></div>
        <div class="resumo-card"><div class="numero" style="font-size:1.1rem">${c.leads || 0}</div><div class="rotulo">Leads</div></div>
        <div class="resumo-card"><div class="numero" style="font-size:1.1rem">${c.conversoes || 0}</div><div class="rotulo">Conversões</div></div>
        <div class="resumo-card"><div class="numero" style="font-size:1.1rem">${formatarMoeda(ind.cpl)}</div><div class="rotulo">CPL</div></div>
        <div class="resumo-card"><div class="numero" style="font-size:1.1rem">${ind.taxaConversao.toFixed(1)}%</div><div class="rotulo">Conversão</div></div>
        <div class="resumo-card"><div class="numero" style="font-size:1.1rem">${ind.roas.toFixed(2)}x</div><div class="rotulo">ROAS</div></div>
      </div>
      ${c.orcamento_previsto > 0 ? `
        <div style="margin-top:10px;background:var(--cinza-borda);border-radius:6px;height:8px;overflow:hidden;">
          <div style="width:${progresso}%;background:var(--laranja);height:100%;"></div>
        </div>
        <div style="font-size:0.72rem;color:var(--texto-suave);margin-top:2px;">${progresso}% do orçamento previsto</div>
      ` : ''}
    </div>
  `;
}

async function carregarResumo() {
  const resumo = await apiGet('/campanhas/resumo');
  document.getElementById('resumo-planejamento').textContent = resumo.planejamento || 0;
  document.getElementById('resumo-ativa').textContent = resumo.ativa || 0;
  document.getElementById('resumo-pausada').textContent = resumo.pausada || 0;
  document.getElementById('resumo-encerrada').textContent = resumo.encerrada || 0;
}

async function carregarLista() {
  const qs = montarQueryDosFiltros([{ id: 'filtro-status', campo: 'status' }, { id: 'filtro-segmento', campo: 'segmento' }]);
  const itens = await apiGet(`/campanhas${qs ? `?${qs}` : ''}`);
  document.getElementById('lista-campanhas').innerHTML = itens.length
    ? itens.map(renderCampanha).join('')
    : '<p style="color:var(--texto-suave)">Nenhuma campanha encontrada.</p>';
  carregarResumo();
}

function abrirModal(c = null) {
  document.getElementById('modal-titulo').textContent = c ? 'Editar campanha' : 'Nova campanha';
  document.getElementById('campo-id').value = c ? c.id : '';
  document.getElementById('campo-nome').value = c ? c.nome : '';
  document.getElementById('campo-status').value = c ? c.status : 'planejamento';
  document.getElementById('campo-segmento').value = c ? c.segmento : 'geral';
  document.getElementById('campo-inicio').value = c && c.inicio ? c.inicio.split('T')[0] : '';
  document.getElementById('campo-fim').value = c && c.fim ? c.fim.split('T')[0] : '';
  document.getElementById('campo-objetivo').value = c ? (c.objetivo || '') : '';
  document.getElementById('campo-orcamento').value = c ? (c.orcamento_previsto || 0) : 0;
  document.getElementById('campo-investido').value = c ? (c.valor_investido || 0) : 0;
  document.getElementById('campo-leads').value = c ? (c.leads || 0) : 0;
  document.getElementById('campo-contatos').value = c ? (c.contatos || 0) : 0;
  document.getElementById('campo-conversoes').value = c ? (c.conversoes || 0) : 0;
  document.getElementById('campo-valor-conversao').value = c ? (c.valor_conversao || 0) : 0;
  document.getElementById('campo-pecas').value = c ? (c.pecas_criativos || '') : '';
  document.getElementById('campo-link').value = c ? (c.link_principal || '') : '';
  document.getElementById('campo-observacoes').value = c ? (c.observacoes || '') : '';
  document.getElementById('btn-excluir').classList.toggle('oculto', !c);
  document.getElementById('btn-duplicar').classList.toggle('oculto', !c);
  document.getElementById('modal').classList.remove('oculto');
}

async function abrirEdicao(id) {
  abrirModal(await apiGet(`/campanhas/${id}`));
}

document.getElementById('btn-novo').addEventListener('click', () => abrirModal());
document.getElementById('btn-cancelar').addEventListener('click', () => document.getElementById('modal').classList.add('oculto'));

document.getElementById('btn-salvar').addEventListener('click', async () => {
  const dados = {
    nome: document.getElementById('campo-nome').value.trim(),
    status: document.getElementById('campo-status').value,
    segmento: document.getElementById('campo-segmento').value,
    inicio: document.getElementById('campo-inicio').value || null,
    fim: document.getElementById('campo-fim').value || null,
    objetivo: document.getElementById('campo-objetivo').value || null,
    orcamento_previsto: document.getElementById('campo-orcamento').value || 0,
    valor_investido: document.getElementById('campo-investido').value || 0,
    leads: document.getElementById('campo-leads').value || 0,
    contatos: document.getElementById('campo-contatos').value || 0,
    conversoes: document.getElementById('campo-conversoes').value || 0,
    valor_conversao: document.getElementById('campo-valor-conversao').value || 0,
    pecas_criativos: document.getElementById('campo-pecas').value || null,
    link_principal: document.getElementById('campo-link').value || null,
    observacoes: document.getElementById('campo-observacoes').value || null,
  };
  if (!dados.nome) { alert('Informe um nome.'); return; }
  const id = document.getElementById('campo-id').value;
  if (id) await apiPut(`/campanhas/${id}`, dados); else await apiPost('/campanhas', dados);
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});

document.getElementById('btn-duplicar').addEventListener('click', async () => {
  await apiPost(`/campanhas/${document.getElementById('campo-id').value}/duplicar`, {});
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});
document.getElementById('btn-excluir').addEventListener('click', async () => {
  const id = document.getElementById('campo-id').value;
  if (!confirm('Excluir esta campanha?')) return;
  await apiDelete(`/campanhas/${id}`);
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});

['filtro-status', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', carregarLista));

checarStatusNuvem();
carregarLista();
