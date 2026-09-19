const ROTULOS_TIPO_AGENDA = { compromisso: 'Compromisso', reuniao: 'Reunião', evento: 'Evento' };
const DIAS_SEMANA_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

let visaoAtual = 'hoje';
let inicioSemana = inicioDaSemana(new Date());

function inicioDaSemana(data) {
  const d = new Date(data);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}
function chaveISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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
  const hoje = await apiGet('/agenda/periodo/hoje');
  document.getElementById('resumo-total-hoje').textContent = hoje.length;
}

async function carregarHeroProximo() {
  const todos = await apiGet('/agenda/periodo/proximos');
  const conflitantes = detectarConflitos(todos);
  const hero = document.getElementById('hero-proximo');
  if (todos.length === 0) { hero.classList.add('oculto'); return; }
  const proximo = todos[0];
  hero.classList.remove('oculto');
  hero.innerHTML = `
    <div>
      <div class="rotulo-hero">Próximo item</div>
      <div class="titulo-hero">${escapeHtml(proximo.titulo)}</div>
      <div class="meta-hero">${ROTULOS_TIPO_AGENDA[proximo.tipo]} · ${formatarData(proximo.data)}${proximo.hora ? ` às ${proximo.hora.slice(0, 5)}` : ''} · ${conflitantes.has(proximo.id) ? '⚠️ conflito de horário' : 'Sem conflitos de horário'}</div>
    </div>
    <button class="btn-secundario" onclick="abrirEdicao(${proximo.id})">Abrir</button>
  `;
}

async function carregarVistaHoje() {
  const [hoje, proximos] = await Promise.all([
    apiGet('/agenda/periodo/hoje'),
    apiGet('/agenda/periodo/7dias'),
  ]);
  const conflitantesHoje = detectarConflitos(hoje);
  document.getElementById('lista-hoje').innerHTML = hoje.length
    ? hoje.map((i) => renderItem(i, conflitantesHoje)).join('')
    : '<p style="color:var(--texto-suave)">Nada para hoje.</p>';

  const hojeISO = chaveISO(new Date());
  const futuros = proximos.filter((i) => i.data.split('T')[0] !== hojeISO);
  const conflitantesProx = detectarConflitos(futuros);
  document.getElementById('lista-proximos').innerHTML = futuros.length
    ? futuros.map((i) => renderItem(i, conflitantesProx)).join('')
    : '<p style="color:var(--texto-suave)">Nada nos próximos 7 dias.</p>';
}

async function carregarVistaSemana() {
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(fimSemana.getDate() + 6);
  document.getElementById('rotulo-semana').textContent =
    `${formatarData(chaveISO(inicioSemana))} – ${formatarData(chaveISO(fimSemana))}`;

  const todos = await apiGet('/agenda');
  const porDia = new Map();
  for (const item of todos) {
    const chave = item.data.split('T')[0];
    if (!porDia.has(chave)) porDia.set(chave, []);
    porDia.get(chave).push(item);
  }

  let html = '';
  for (let i = 0; i < 7; i++) {
    const dia = new Date(inicioSemana);
    dia.setDate(dia.getDate() + i);
    const iso = chaveISO(dia);
    const itens = porDia.get(iso) || [];
    html += `
      <div class="semana-dia">
        <div class="cab">${DIAS_SEMANA_CURTOS[dia.getDay()]}<br>${String(dia.getDate()).padStart(2, '0')}/${String(dia.getMonth() + 1).padStart(2, '0')}</div>
        ${itens.map((it) => `<div class="item" title="${escapeHtml(it.titulo)}">${escapeHtml(it.titulo)}</div>`).join('')}
      </div>
    `;
  }
  document.getElementById('semana-grid').innerHTML = html;
}

async function carregarVistaLista() {
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
}

function trocarVisao(nova) {
  visaoAtual = nova;
  document.getElementById('btn-visao-hoje').classList.toggle('ativo', nova === 'hoje');
  document.getElementById('btn-visao-semana').classList.toggle('ativo', nova === 'semana');
  document.getElementById('btn-visao-lista').classList.toggle('ativo', nova === 'lista');
  document.getElementById('vista-hoje').classList.toggle('oculto', nova !== 'hoje');
  document.getElementById('vista-semana').classList.toggle('oculto', nova !== 'semana');
  document.getElementById('vista-lista').classList.toggle('oculto', nova !== 'lista');
  document.getElementById('barra-filtros-lista').classList.toggle('oculto', nova !== 'lista');
  carregarVisaoAtual();
}

function carregarVisaoAtual() {
  if (visaoAtual === 'hoje') carregarVistaHoje();
  else if (visaoAtual === 'semana') carregarVistaSemana();
  else carregarVistaLista();
}

function recarregarTudo() {
  carregarResumo();
  carregarHeroProximo();
  carregarVisaoAtual();
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
  recarregarTudo();
});

document.getElementById('btn-excluir').addEventListener('click', async () => {
  const id = document.getElementById('campo-id').value;
  if (!confirm('Excluir este item?')) return;
  await apiDelete(`/agenda/${id}`);
  document.getElementById('modal').classList.add('oculto');
  recarregarTudo();
});

document.getElementById('btn-rapido-adicionar').addEventListener('click', async () => {
  const titulo = document.getElementById('rapido-titulo').value.trim();
  if (!titulo) return;
  await apiPost('/agenda', { titulo, tipo: document.getElementById('rapido-tipo').value, data: chaveISO(new Date()), segmento: 'geral' });
  document.getElementById('rapido-titulo').value = '';
  recarregarTudo();
});
document.getElementById('rapido-titulo').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-rapido-adicionar').click();
});

document.getElementById('btn-visao-hoje').addEventListener('click', () => trocarVisao('hoje'));
document.getElementById('btn-visao-semana').addEventListener('click', () => trocarVisao('semana'));
document.getElementById('btn-visao-lista').addEventListener('click', () => trocarVisao('lista'));

document.getElementById('btn-semana-anterior').addEventListener('click', () => {
  inicioSemana.setDate(inicioSemana.getDate() - 7);
  carregarVistaSemana();
});
document.getElementById('btn-semana-seguinte').addEventListener('click', () => {
  inicioSemana.setDate(inicioSemana.getDate() + 7);
  carregarVistaSemana();
});

['filtro-periodo', 'filtro-tipo', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', carregarVistaLista));

checarStatusNuvem();
recarregarTudo();
