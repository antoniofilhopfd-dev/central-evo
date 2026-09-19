const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ORIGEM_HREF = { agenda: 'agenda.html', tarefas: 'tarefas.html' };
const ROTULOS_TIPO_CAL = { prazo: 'Prazo', evento: 'Evento', entrega: 'Entrega' };

let dataAtual = new Date();
let visaoAtual = 'mes';
let subFiltroLista = 'proximos';
let itensDoMes = [];

function chaveISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function filtrosSelecionados() {
  return montarQueryDosFiltros([
    { id: 'filtro-origem', campo: 'origem' },
    { id: 'filtro-tipo', campo: 'tipo' },
    { id: 'filtro-segmento', campo: 'segmento' },
  ]);
}

function aplicarBusca(itens) {
  const termo = document.getElementById('busca-evento').value.trim().toLowerCase();
  if (!termo) return itens;
  return itens.filter((it) => it.titulo.toLowerCase().includes(termo));
}

document.getElementById('cal-cabecalho').innerHTML = DIAS_SEMANA.map((d) => `<div class="cal-cabecalho">${d}</div>`).join('');

function trocarVisao(nova) {
  visaoAtual = nova;
  document.getElementById('btn-visao-mes').classList.toggle('ativo', nova === 'mes');
  document.getElementById('btn-visao-ano').classList.toggle('ativo', nova === 'ano');
  document.getElementById('btn-visao-lista').classList.toggle('ativo', nova === 'lista');
  document.getElementById('vista-mes').classList.toggle('oculto', nova !== 'mes');
  document.getElementById('vista-ano').classList.toggle('oculto', nova !== 'ano');
  document.getElementById('vista-lista').classList.toggle('oculto', nova !== 'lista');
  document.getElementById('barra-navegacao').classList.toggle('oculto', nova === 'lista');
  document.getElementById('barra-lista-sub').classList.toggle('oculto', nova !== 'lista');
  carregarVisaoAtual();
}

function carregarVisaoAtual() {
  if (visaoAtual === 'mes') carregarMes();
  else if (visaoAtual === 'ano') carregarAno();
  else carregarLista();
}

async function carregarMes() {
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth() + 1;
  document.getElementById('rotulo-periodo').textContent = `${NOMES_MES[mes - 1]} ${ano}`;
  const qs = filtrosSelecionados();
  itensDoMes = await apiGet(`/calendario?mes=${mes}&ano=${ano}${qs ? `&${qs}` : ''}`);
  renderGrade();
}

function renderGrade() {
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const inicioGrade = new Date(primeiroDia);
  inicioGrade.setDate(inicioGrade.getDate() - primeiroDia.getDay());

  const itensFiltrados = aplicarBusca(itensDoMes);
  const porDia = new Map();
  for (const item of itensFiltrados) {
    const chave = item.data.split('T')[0];
    if (!porDia.has(chave)) porDia.set(chave, []);
    porDia.get(chave).push(item);
  }

  const hojeISO = chaveISO(new Date());
  let html = '';
  for (let i = 0; i < 42; i++) {
    const dia = new Date(inicioGrade);
    dia.setDate(inicioGrade.getDate() + i);
    const iso = chaveISO(dia);
    const itens = porDia.get(iso) || [];
    const foraDoMes = dia.getMonth() !== mes;
    html += `
      <div class="cal-dia ${foraDoMes ? 'fora-do-mes' : ''} ${iso === hojeISO ? 'hoje' : ''}" onclick="abrirDia('${iso}')">
        <div class="num">${dia.getDate()}</div>
        ${itens.slice(0, 3).map((it) => `<div class="cal-item tipo-${it.tipo} seg-${it.segmento}" title="${escapeHtml(it.titulo)}">${escapeHtml(it.titulo)}</div>`).join('')}
        ${itens.length > 3 ? `<div style="font-size:0.65rem;color:var(--texto-suave)">+${itens.length - 3}</div>` : ''}
      </div>
    `;
  }
  document.getElementById('cal-corpo').innerHTML = html;
}

async function carregarAno() {
  const ano = dataAtual.getFullYear();
  document.getElementById('rotulo-periodo').textContent = `${ano}`;
  const qs = filtrosSelecionados();
  const porMes = Array.from({ length: 12 }, () => []);
  const todasPromessas = [];
  for (let m = 1; m <= 12; m++) {
    todasPromessas.push(
      apiGet(`/calendario?mes=${m}&ano=${ano}${qs ? `&${qs}` : ''}`).then((itens) => { porMes[m - 1] = aplicarBusca(itens); })
    );
  }
  await Promise.all(todasPromessas);

  document.getElementById('ano-grid').innerHTML = NOMES_MES.map((nome, idx) => `
    <div class="ano-mes" onclick="irParaMes(${idx})">
      <h3>${nome}</h3>
      <div class="qtd">${porMes[idx].length} evento${porMes[idx].length === 1 ? '' : 's'}</div>
    </div>
  `).join('');
}

function irParaMes(idx) {
  dataAtual = new Date(dataAtual.getFullYear(), idx, 1);
  trocarVisao('mes');
}

async function carregarLista() {
  const qs = filtrosSelecionados();
  const todosOsAnos = await Promise.all(
    [dataAtual.getFullYear() - 1, dataAtual.getFullYear(), dataAtual.getFullYear() + 1].map((ano) =>
      Promise.all(Array.from({ length: 12 }, (_, m) => apiGet(`/calendario?mes=${m + 1}&ano=${ano}${qs ? `&${qs}` : ''}`)))
    )
  );
  let itens = todosOsAnos.flat(2);
  const vistos = new Set();
  itens = itens.filter((it) => {
    const chave = `${it.origem}_${it.id}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
  itens = aplicarBusca(itens);

  const hojeISO = chaveISO(new Date());
  if (subFiltroLista === 'proximos') itens = itens.filter((it) => it.data.split('T')[0] >= hojeISO);
  else if (subFiltroLista === 'passados') itens = itens.filter((it) => it.data.split('T')[0] < hojeISO);
  itens.sort((a, b) => a.data.localeCompare(b.data));

  document.getElementById('contagem-lista').textContent = `${itens.length} encontrado${itens.length === 1 ? '' : 's'}`;
  document.getElementById('lista-eventos').innerHTML = itens.length
    ? itens.map((it) => `
      <div class="tarefa-item">
        <div class="tarefa-info">
          <div class="tarefa-titulo">${escapeHtml(it.titulo)}</div>
          <div class="tarefa-meta">
            <span class="tag">${ROTULOS_TIPO_CAL[it.tipo] || it.tipo}</span>
            <span class="tag">${ROTULOS_SEGMENTO[it.segmento] || it.segmento}</span>
            <span>📅 ${formatarData(it.data)}</span>
            <span>origem: ${it.origem}</span>
          </div>
        </div>
        ${ORIGEM_HREF[it.origem] ? `<div class="tarefa-acoes"><a href="${ORIGEM_HREF[it.origem]}" class="btn-secundario" style="padding:4px 10px;">Abrir módulo</a></div>` : ''}
      </div>
    `).join('')
    : '<p style="color:var(--texto-suave)">Nenhum evento encontrado.</p>';
}

async function abrirDia(iso) {
  const qs = filtrosSelecionados();
  let itens = await apiGet(`/calendario?data=${iso}${qs ? `&${qs}` : ''}`);
  itens = aplicarBusca(itens);
  document.getElementById('titulo-dia').textContent = `Agenda do dia — ${formatarData(iso)}`;
  document.getElementById('lista-dia').innerHTML = itens.length
    ? itens.map((it) => `
      <div class="tarefa-item">
        <div class="tarefa-info">
          <div class="tarefa-titulo">${escapeHtml(it.titulo)}</div>
          <div class="tarefa-meta">
            <span class="tag">${ROTULOS_TIPO_CAL[it.tipo] || it.tipo}</span>
            <span class="tag">${ROTULOS_SEGMENTO[it.segmento] || it.segmento}</span>
            <span>origem: ${it.origem}</span>
          </div>
        </div>
        ${ORIGEM_HREF[it.origem] ? `<div class="tarefa-acoes"><a href="${ORIGEM_HREF[it.origem]}" class="btn-secundario" style="padding:4px 10px;">Abrir módulo</a></div>` : ''}
      </div>
    `).join('')
    : '<p style="color:var(--texto-suave)">Nenhum item neste dia.</p>';
  document.getElementById('painel-dia').classList.remove('oculto');
}

document.getElementById('btn-visao-mes').addEventListener('click', () => trocarVisao('mes'));
document.getElementById('btn-visao-ano').addEventListener('click', () => trocarVisao('ano'));
document.getElementById('btn-visao-lista').addEventListener('click', () => trocarVisao('lista'));

document.getElementById('btn-anterior').addEventListener('click', () => {
  if (visaoAtual === 'ano') dataAtual.setFullYear(dataAtual.getFullYear() - 1);
  else dataAtual.setMonth(dataAtual.getMonth() - 1);
  carregarVisaoAtual();
});
document.getElementById('btn-seguinte').addEventListener('click', () => {
  if (visaoAtual === 'ano') dataAtual.setFullYear(dataAtual.getFullYear() + 1);
  else dataAtual.setMonth(dataAtual.getMonth() + 1);
  carregarVisaoAtual();
});
document.getElementById('btn-hoje').addEventListener('click', () => { dataAtual = new Date(); carregarVisaoAtual(); });

document.querySelectorAll('#barra-lista-sub [data-sub]').forEach((btn) => {
  btn.addEventListener('click', () => {
    subFiltroLista = btn.dataset.sub;
    document.querySelectorAll('#barra-lista-sub [data-sub]').forEach((b) => b.classList.toggle('ativo', b === btn));
    carregarLista();
  });
});

['filtro-origem', 'filtro-tipo', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', carregarVisaoAtual));
document.getElementById('busca-evento').addEventListener('input', () => {
  if (visaoAtual === 'mes') renderGrade();
  else carregarVisaoAtual();
});
document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
  document.getElementById('filtro-origem').value = '';
  document.getElementById('filtro-tipo').value = '';
  document.getElementById('filtro-segmento').value = '';
  document.getElementById('busca-evento').value = '';
  carregarVisaoAtual();
});

document.getElementById('btn-novo-item').addEventListener('click', () => document.getElementById('modal').classList.remove('oculto'));
document.getElementById('btn-cancelar').addEventListener('click', () => document.getElementById('modal').classList.add('oculto'));
document.getElementById('btn-salvar').addEventListener('click', async () => {
  const dados = {
    titulo: document.getElementById('campo-titulo').value.trim(),
    tipo: document.getElementById('campo-tipo').value,
    segmento: document.getElementById('campo-segmento').value,
    data: document.getElementById('campo-data').value,
    data_fim: document.getElementById('campo-data-fim').value || null,
    observacoes: document.getElementById('campo-observacoes').value || null,
  };
  if (!dados.titulo || !dados.data) { alert('Título e data são obrigatórios.'); return; }
  await apiPost('/calendario/itens', dados);
  document.getElementById('modal').classList.add('oculto');
  carregarVisaoAtual();
});

checarStatusNuvem();
carregarMes();
