const ROTULOS_ETAPA_CONTEUDO = { ideia: 'Ideia', producao: 'Produção', aprovacao: 'Aprovação', programado: 'Programado', publicado: 'Publicado' };
const ROTULOS_TIPO_CONTEUDO = { post: 'Post', reels: 'Reels/Vídeo', story: 'Story', design: 'Design', foto: 'Foto', outro: 'Outro' };

let vistaAtual = 'quadro';

async function carregarResumo() {
  const resumo = await apiGet('/conteudos/resumo');
  for (const etapa of Object.keys(ROTULOS_ETAPA_CONTEUDO)) {
    document.getElementById(`resumo-${etapa}`).textContent = resumo[etapa] || 0;
  }
}

function renderItemLista(item) {
  return `
    <div class="tarefa-item" data-id="${item.id}">
      <div class="tarefa-info">
        <div class="tarefa-titulo">${escapeHtml(item.titulo)}</div>
        <div class="tarefa-meta">
          <span class="tag">${ROTULOS_ETAPA_CONTEUDO[item.etapa]}</span>
          <span class="tag">${ROTULOS_TIPO_CONTEUDO[item.tipo]}</span>
          <span class="tag">${ROTULOS_SEGMENTO[item.segmento]}</span>
          ${item.data_publicacao ? `<span>📅 ${formatarData(item.data_publicacao)}</span>` : ''}
        </div>
      </div>
      <div class="tarefa-acoes">
        ${item.link ? `<a class="btn-icone" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" title="Abrir link">🔗</a>` : ''}
        <button class="btn-icone" onclick="abrirEdicao(${item.id})" title="Editar">✏️</button>
      </div>
    </div>
  `;
}

async function carregarConteudos() {
  const qs = montarQueryDosFiltros([
    { id: 'filtro-tipo', campo: 'tipo' },
    { id: 'filtro-segmento', campo: 'segmento' },
  ]);
  const itens = await apiGet(`/conteudos${qs ? `?${qs}` : ''}`);

  if (vistaAtual === 'lista') {
    document.getElementById('lista-conteudo').innerHTML = itens.length
      ? itens.map(renderItemLista).join('')
      : '<p style="color:var(--texto-suave)">Nenhum conteúdo encontrado.</p>';
  } else {
    for (const etapa of Object.keys(ROTULOS_ETAPA_CONTEUDO)) document.getElementById(`kanban-${etapa}`).innerHTML = '';
    itens.forEach((item) => {
      const col = document.getElementById(`kanban-${item.etapa}`);
      if (!col) return;
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.draggable = true;
      card.dataset.id = item.id;
      card.innerHTML = `<strong>${escapeHtml(item.titulo)}</strong><br><span style="font-size:0.72rem;color:var(--texto-suave)">${ROTULOS_TIPO_CONTEUDO[item.tipo]}</span>`;
      card.addEventListener('click', () => abrirEdicao(item.id));
      card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', item.id));
      col.appendChild(card);
    });
  }
  carregarResumo();
}

document.querySelectorAll('.kanban-coluna').forEach((coluna) => {
  coluna.addEventListener('dragover', (e) => e.preventDefault());
  coluna.addEventListener('drop', async (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    await apiPut(`/conteudos/${id}/ordem`, { ordem_kanban: 0, etapa: coluna.dataset.etapa });
    carregarConteudos();
  });
});

function marcarChecklist(checklist = {}) {
  document.querySelectorAll('#checklist-editorial input[type=checkbox]').forEach((cb) => {
    cb.checked = !!checklist[cb.dataset.check];
  });
}
function lerChecklist() {
  const out = {};
  document.querySelectorAll('#checklist-editorial input[type=checkbox]').forEach((cb) => { out[cb.dataset.check] = cb.checked; });
  return out;
}

function abrirModal(item = null) {
  document.getElementById('modal-titulo').textContent = item ? 'Editar conteúdo' : 'Novo conteúdo';
  document.getElementById('campo-id').value = item ? item.id : '';
  document.getElementById('campo-titulo').value = item ? item.titulo : '';
  document.getElementById('campo-etapa').value = item ? item.etapa : 'ideia';
  document.getElementById('campo-tipo-item').value = item ? item.tipo : 'post';
  document.getElementById('campo-segmento-item').value = item ? item.segmento : 'geral';
  document.getElementById('campo-etapa-infantil').value = item ? (item.etapa_infantil || '') : '';
  document.getElementById('campo-data-publicacao').value = item && item.data_publicacao ? item.data_publicacao.split('T')[0] : '';
  document.getElementById('campo-briefing').value = item ? (item.briefing || '') : '';
  document.getElementById('campo-link').value = item ? (item.link || '') : '';
  document.getElementById('campo-cta').value = item ? (item.cta || '') : '';
  document.getElementById('campo-objetivo').value = item ? (item.objetivo || '') : '';
  document.getElementById('campo-observacoes').value = item ? (item.observacoes || '') : '';
  marcarChecklist(item ? item.checklist : {});
  document.getElementById('btn-excluir').classList.toggle('oculto', !item);
  document.getElementById('btn-duplicar').classList.toggle('oculto', !item);
  atualizarEtapaInfantil();
  document.getElementById('modal').classList.remove('oculto');
}

function atualizarEtapaInfantil() {
  document.getElementById('grupo-etapa-infantil').classList.toggle('oculto', document.getElementById('campo-segmento-item').value !== 'infantil');
}

async function abrirEdicao(id) {
  abrirModal(await apiGet(`/conteudos/${id}`));
}

document.getElementById('campo-segmento-item').addEventListener('change', atualizarEtapaInfantil);
document.getElementById('btn-novo').addEventListener('click', () => abrirModal());
document.getElementById('btn-cancelar').addEventListener('click', () => document.getElementById('modal').classList.add('oculto'));

document.getElementById('btn-salvar').addEventListener('click', async () => {
  const dados = {
    titulo: document.getElementById('campo-titulo').value.trim(),
    etapa: document.getElementById('campo-etapa').value,
    tipo: document.getElementById('campo-tipo-item').value,
    segmento: document.getElementById('campo-segmento-item').value,
    etapa_infantil: document.getElementById('campo-segmento-item').value === 'infantil' ? (document.getElementById('campo-etapa-infantil').value || null) : null,
    data_publicacao: document.getElementById('campo-data-publicacao').value || null,
    briefing: document.getElementById('campo-briefing').value || null,
    link: document.getElementById('campo-link').value || null,
    cta: document.getElementById('campo-cta').value || null,
    objetivo: document.getElementById('campo-objetivo').value || null,
    observacoes: document.getElementById('campo-observacoes').value || null,
    checklist: lerChecklist(),
  };
  if (!dados.titulo) { alert('Informe um título.'); return; }
  const id = document.getElementById('campo-id').value;
  if (id) await apiPut(`/conteudos/${id}`, dados); else await apiPost('/conteudos', dados);
  document.getElementById('modal').classList.add('oculto');
  carregarConteudos();
});

document.getElementById('btn-duplicar').addEventListener('click', async () => {
  const id = document.getElementById('campo-id').value;
  await apiPost(`/conteudos/${id}/duplicar`, {});
  document.getElementById('modal').classList.add('oculto');
  carregarConteudos();
});

document.getElementById('btn-excluir').addEventListener('click', async () => {
  const id = document.getElementById('campo-id').value;
  if (!confirm('Excluir este conteúdo?')) return;
  await apiDelete(`/conteudos/${id}`);
  document.getElementById('modal').classList.add('oculto');
  carregarConteudos();
});

['filtro-tipo', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', carregarConteudos));

document.getElementById('btn-vista-quadro').addEventListener('click', () => {
  vistaAtual = 'quadro';
  document.getElementById('btn-vista-quadro').classList.add('ativo');
  document.getElementById('btn-vista-lista').classList.remove('ativo');
  document.getElementById('vista-quadro').classList.remove('oculto');
  document.getElementById('vista-lista').classList.add('oculto');
  carregarConteudos();
});
document.getElementById('btn-vista-lista').addEventListener('click', () => {
  vistaAtual = 'lista';
  document.getElementById('btn-vista-lista').classList.add('ativo');
  document.getElementById('btn-vista-quadro').classList.remove('ativo');
  document.getElementById('vista-lista').classList.remove('oculto');
  document.getElementById('vista-quadro').classList.add('oculto');
  carregarConteudos();
});

checarStatusNuvem();
carregarConteudos();
