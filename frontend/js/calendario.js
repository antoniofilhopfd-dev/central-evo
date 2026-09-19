const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ORIGEM_HREF = { agenda: 'agenda.html', tarefas: 'tarefas.html', conteudo: 'conteudo.html', campanhas: 'campanhas.html', eventos: 'eventos.html', projetos: 'projetos.html' };

let dataAtual = new Date();
let itensDoMes = [];

function chaveISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

document.getElementById('cal-cabecalho').innerHTML = DIAS_SEMANA.map((d) => `<div class="cal-cabecalho">${d}</div>`).join('');

async function carregarMes() {
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth() + 1;
  document.getElementById('rotulo-mes').textContent = `${NOMES_MES[mes - 1]} ${ano}`;

  const qs = montarQueryDosFiltros([
    { id: 'filtro-origem', campo: 'origem' },
    { id: 'filtro-tipo', campo: 'tipo' },
    { id: 'filtro-segmento', campo: 'segmento' },
  ]);
  itensDoMes = await apiGet(`/calendario?mes=${mes}&ano=${ano}${qs ? `&${qs}` : ''}`);
  renderGrade();
}

function renderGrade() {
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const inicioGrade = new Date(primeiroDia);
  inicioGrade.setDate(inicioGrade.getDate() - primeiroDia.getDay());

  const porDia = new Map();
  for (const item of itensDoMes) {
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
        ${itens.slice(0, 3).map((it) => `<div class="cal-item tipo-${it.tipo}" title="${it.titulo}">${it.titulo}</div>`).join('')}
        ${itens.length > 3 ? `<div style="font-size:0.65rem;color:var(--texto-suave)">+${itens.length - 3}</div>` : ''}
      </div>
    `;
    if (i === 41) break;
  }
  document.getElementById('cal-corpo').innerHTML = html;
}

async function abrirDia(iso) {
  const qs = montarQueryDosFiltros([
    { id: 'filtro-origem', campo: 'origem' },
    { id: 'filtro-tipo', campo: 'tipo' },
    { id: 'filtro-segmento', campo: 'segmento' },
  ]);
  const itens = await apiGet(`/calendario?data=${iso}${qs ? `&${qs}` : ''}`);
  document.getElementById('titulo-dia').textContent = `Agenda do dia — ${formatarData(iso)}`;
  document.getElementById('lista-dia').innerHTML = itens.length
    ? itens.map((it) => `
      <div class="tarefa-item">
        <div class="tarefa-info">
          <div class="tarefa-titulo">${it.titulo}</div>
          <div class="tarefa-meta">
            <span class="tag">${it.tipo}</span>
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

document.getElementById('btn-mes-anterior').addEventListener('click', () => { dataAtual.setMonth(dataAtual.getMonth() - 1); carregarMes(); });
document.getElementById('btn-mes-seguinte').addEventListener('click', () => { dataAtual.setMonth(dataAtual.getMonth() + 1); carregarMes(); });
document.getElementById('btn-hoje').addEventListener('click', () => { dataAtual = new Date(); carregarMes(); });
['filtro-origem', 'filtro-tipo', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', carregarMes));

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
  carregarMes();
});

checarStatusNuvem();
carregarMes();
