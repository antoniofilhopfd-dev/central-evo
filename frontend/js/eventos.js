const ROTULOS_STATUS_EVENTO = { planejamento: 'Planejamento', pronto: 'Pronto', concluido: 'Concluído' };

function renderEvento(e) {
  const etapas = [
    e.etapa_divulgacao && 'Divulgação', e.etapa_foto && 'Foto', e.etapa_video && 'Vídeo', e.etapa_pos_evento && 'Pós-evento',
  ].filter(Boolean);
  return `
    <div class="secao" style="margin-bottom:0;padding:14px;" data-id="${e.id}">
      <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;">
        <div>
          <strong>${e.nome}</strong>
          <div class="tarefa-meta" style="margin-top:4px;">
            <span class="tag">${ROTULOS_STATUS_EVENTO[e.status]}</span>
            <span class="tag">${ROTULOS_SEGMENTO[e.segmento]}</span>
            ${e.etapa_infantil ? `<span class="tag">${ROTULOS_ETAPA_INFANTIL[e.etapa_infantil]}</span>` : ''}
            ${e.data ? `<span>📅 ${formatarData(e.data)}${e.hora ? ` às ${e.hora.slice(0, 5)}` : ''}</span>` : ''}
            ${e.local ? `<span>📍 ${e.local}</span>` : ''}
          </div>
          ${etapas.length ? `<div style="margin-top:6px;font-size:0.78rem;color:var(--texto-suave)">Etapas concluídas: ${etapas.join(', ')}</div>` : ''}
        </div>
        <div class="tarefa-acoes">
          ${e.link_principal ? `<a class="btn-icone" href="${e.link_principal}" target="_blank">🔗</a>` : ''}
          <button class="btn-icone" onclick="abrirEdicao(${e.id})">✏️</button>
        </div>
      </div>
    </div>
  `;
}

async function carregarResumo() {
  const resumo = await apiGet('/eventos/resumo');
  const todos = await apiGet('/eventos');
  const hojeISO = new Date().toISOString().split('T')[0];
  const hoje = todos.filter((e) => e.data && e.data.split('T')[0] === hojeISO).length;
  const proximos = todos.filter((e) => e.data && e.data.split('T')[0] >= hojeISO && e.status !== 'concluido').length;
  document.getElementById('resumo-planejamento').textContent = resumo.planejamento || 0;
  document.getElementById('resumo-proximos').textContent = proximos;
  document.getElementById('resumo-hoje').textContent = hoje;
  document.getElementById('resumo-concluido').textContent = resumo.concluido || 0;
}

async function carregarLista() {
  const qs = montarQueryDosFiltros([{ id: 'filtro-status', campo: 'status' }, { id: 'filtro-segmento', campo: 'segmento' }]);
  const itens = await apiGet(`/eventos${qs ? `?${qs}` : ''}`);
  document.getElementById('lista-eventos').innerHTML = itens.length
    ? itens.map(renderEvento).join('')
    : '<p style="color:var(--texto-suave)">Nenhum evento encontrado.</p>';
  carregarResumo();
}

function abrirModal(e = null) {
  document.getElementById('modal-titulo').textContent = e ? 'Editar evento' : 'Novo evento';
  document.getElementById('campo-id').value = e ? e.id : '';
  document.getElementById('campo-nome').value = e ? e.nome : '';
  document.getElementById('campo-status').value = e ? e.status : 'planejamento';
  document.getElementById('campo-segmento').value = e ? e.segmento : 'geral';
  document.getElementById('campo-etapa-infantil').value = e ? (e.etapa_infantil || '') : '';
  document.getElementById('campo-data').value = e && e.data ? e.data.split('T')[0] : '';
  document.getElementById('campo-hora').value = e && e.hora ? e.hora.slice(0, 5) : '';
  document.getElementById('campo-local').value = e ? (e.local || '') : '';
  document.getElementById('campo-descricao').value = e ? (e.descricao || '') : '';
  document.getElementById('et-divulgacao').checked = e ? e.etapa_divulgacao : false;
  document.getElementById('et-foto').checked = e ? e.etapa_foto : false;
  document.getElementById('et-video').checked = e ? e.etapa_video : false;
  document.getElementById('et-pos').checked = e ? e.etapa_pos_evento : false;
  document.getElementById('campo-link').value = e ? (e.link_principal || '') : '';
  document.getElementById('btn-excluir').classList.toggle('oculto', !e);
  document.getElementById('btn-duplicar').classList.toggle('oculto', !e);
  atualizarEtapaInfantil();
  document.getElementById('modal').classList.remove('oculto');
}

function atualizarEtapaInfantil() {
  document.getElementById('grupo-etapa-infantil').classList.toggle('oculto', document.getElementById('campo-segmento').value !== 'infantil');
}

async function abrirEdicao(id) {
  abrirModal(await apiGet(`/eventos/${id}`));
}

document.getElementById('campo-segmento').addEventListener('change', atualizarEtapaInfantil);
document.getElementById('btn-novo').addEventListener('click', () => abrirModal());
document.getElementById('btn-cancelar').addEventListener('click', () => document.getElementById('modal').classList.add('oculto'));

document.getElementById('btn-salvar').addEventListener('click', async () => {
  const dados = {
    nome: document.getElementById('campo-nome').value.trim(),
    status: document.getElementById('campo-status').value,
    segmento: document.getElementById('campo-segmento').value,
    etapa_infantil: document.getElementById('campo-segmento').value === 'infantil' ? (document.getElementById('campo-etapa-infantil').value || null) : null,
    data: document.getElementById('campo-data').value || null,
    hora: document.getElementById('campo-hora').value || null,
    local: document.getElementById('campo-local').value || null,
    descricao: document.getElementById('campo-descricao').value || null,
    etapa_divulgacao: document.getElementById('et-divulgacao').checked,
    etapa_foto: document.getElementById('et-foto').checked,
    etapa_video: document.getElementById('et-video').checked,
    etapa_pos_evento: document.getElementById('et-pos').checked,
    link_principal: document.getElementById('campo-link').value || null,
  };
  if (!dados.nome) { alert('Informe um nome.'); return; }
  const id = document.getElementById('campo-id').value;
  if (id) await apiPut(`/eventos/${id}`, dados); else await apiPost('/eventos', dados);
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});

document.getElementById('btn-duplicar').addEventListener('click', async () => {
  await apiPost(`/eventos/${document.getElementById('campo-id').value}/duplicar`, {});
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});
document.getElementById('btn-excluir').addEventListener('click', async () => {
  const id = document.getElementById('campo-id').value;
  if (!confirm('Excluir este evento?')) return;
  await apiDelete(`/eventos/${id}`);
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});

['filtro-status', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', carregarLista));

checarStatusNuvem();
carregarLista();
