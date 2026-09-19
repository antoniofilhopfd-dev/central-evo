const SVG_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const ICONES = {
  agenda: `<svg ${SVG_ATTRS}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  calendario: `<svg ${SVG_ATTRS}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
  tarefas: `<svg ${SVG_ATTRS}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12l3 3 5-6"/></svg>`,
  arquivos: `<svg ${SVG_ATTRS}><path d="M9 12a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M15 12a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/></svg>`,
  relatorios: `<svg ${SVG_ATTRS}><path d="M4 20V10M12 20V4M20 20v-7"/></svg>`,
};

const APPS = [
  { nome: 'Agenda', icone: ICONES.agenda, href: 'agenda.html' },
  { nome: 'Calendário', icone: ICONES.calendario, href: 'calendario.html' },
  { nome: 'Tarefas', icone: ICONES.tarefas, href: 'tarefas.html' },
  { nome: 'Arquivos', icone: ICONES.arquivos, href: 'arquivos.html' },
  { nome: 'Relatórios', icone: ICONES.relatorios, href: 'relatorios.html' },
];

function renderApps() {
  const grid = document.getElementById('apps-grid');
  grid.innerHTML = APPS.map((app) => `
    <div class="app-card ${app.href ? '' : 'desabilitado'}" data-href="${app.href || ''}">
      <span class="icone">${app.icone}</span>
      <span class="nome">${app.nome}</span>
      ${app.href ? '' : '<span class="badge-em-construcao">em construção</span>'}
    </div>
  `).join('');
  grid.querySelectorAll('.app-card[data-href]').forEach((card) => {
    const href = card.dataset.href;
    if (!href) return;
    card.addEventListener('click', () => { window.location.href = href; });
  });
}

async function checarStatus() {
  const indNuvem = document.getElementById('ind-nuvem');
  const indInternet = document.getElementById('ind-internet');
  const txtModo = document.getElementById('txt-modo');
  try {
    const r = await fetch(`${API_BASE}/health`);
    const dados = await r.json();
    indInternet.className = 'bolinha ok';
    indNuvem.className = dados.status === 'ok' ? 'bolinha ok' : 'bolinha erro';
    txtModo.textContent = dados.ambiente === 'production' ? 'Produção' : 'Homologação';
  } catch (err) {
    indInternet.className = 'bolinha erro';
    indNuvem.className = 'bolinha erro';
    txtModo.textContent = 'offline';
  }
}

async function carregarResumoMeuDia() {
  try {
    const r = await fetch(`${API_BASE}/tarefas?prazo=hoje`);
    const tarefas = await r.json();
    document.getElementById('qtd-tarefas-hoje').textContent = tarefas.length;
  } catch (err) {
    document.getElementById('qtd-tarefas-hoje').textContent = '—';
  }
  try {
    const r = await fetch(`${API_BASE}/agenda/periodo/hoje`);
    const itens = await r.json();
    document.getElementById('qtd-compromissos-hoje').textContent = itens.length;
  } catch (err) {
    document.getElementById('qtd-compromissos-hoje').textContent = '—';
  }
}

document.getElementById('busca-global').addEventListener('input', async (e) => {
  const termo = e.target.value.trim().toLowerCase();
  const resultadoEl = document.getElementById('resultado-busca-global');
  if (termo.length < 2) { resultadoEl.innerHTML = ''; return; }
  try {
    const r = await fetch(`${API_BASE}/tarefas`);
    const tarefas = await r.json();
    const encontrados = tarefas.filter((t) => t.titulo.toLowerCase().includes(termo));
    resultadoEl.innerHTML = encontrados.length
      ? `<h3 style="font-size:0.85rem;margin-top:12px;">Tarefas</h3>` + encontrados.map((t) =>
          `<div class="tarefa-item"><div class="tarefa-info"><div class="tarefa-titulo">${escapeHtml(t.titulo)}</div></div></div>`
        ).join('')
      : `<p style="color:var(--texto-suave)">Nenhum resultado.</p>`;
  } catch (err) {
    resultadoEl.innerHTML = '';
  }
});

renderApps();
checarStatus();
carregarResumoMeuDia();
