const API_BASE = window.location.origin.replace(/:\d+$/, '') + ':3001/api';

const APPS = [
  { nome: 'Agenda', icone: '📅', href: null },
  { nome: 'Calendário', icone: '🗓️', href: null },
  { nome: 'Tarefas', icone: '✅', href: 'tarefas.html' },
  { nome: 'Conteúdo', icone: '📝', href: null },
  { nome: 'Campanhas', icone: '📣', href: null },
  { nome: 'Eventos', icone: '🎉', href: null },
  { nome: 'Projetos', icone: '📁', href: null },
  { nome: 'Arquivos', icone: '🔗', href: null },
  { nome: 'Instagram', icone: '📷', href: null },
  { nome: 'Relatórios', icone: '📊', href: null },
];

function renderApps() {
  const grid = document.getElementById('apps-grid');
  grid.innerHTML = APPS.map((app) => `
    <div class="app-card ${app.href ? '' : 'desabilitado'}" ${app.href ? `onclick="window.location.href='${app.href}'"` : ''}>
      <span class="icone">${app.icone}</span>
      <span class="nome">${app.nome}</span>
      ${app.href ? '' : '<span class="badge-em-construcao">em construção</span>'}
    </div>
  `).join('');
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
          `<div class="tarefa-item"><div class="tarefa-info"><div class="tarefa-titulo">${t.titulo}</div></div></div>`
        ).join('')
      : `<p style="color:var(--texto-suave)">Nenhum resultado.</p>`;
  } catch (err) {
    resultadoEl.innerHTML = '';
  }
});

renderApps();
checarStatus();
carregarResumoMeuDia();
