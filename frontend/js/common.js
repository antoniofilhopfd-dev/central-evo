const API_BASE = window.location.origin.replace(/:\d+$/, '') + ':3001/api';

const ROTULOS_SEGMENTO = {
  geral: 'Geral', infantil: 'Infantil', anos_iniciais: 'Anos Iniciais',
  anos_finais: 'Anos Finais', ensino_medio: 'Ensino Médio',
};
const ROTULOS_ETAPA_INFANTIL = { todo_infantil: 'Todo Infantil', maternal: 'Maternal', jardim: 'Jardim' };

async function apiGet(caminho) {
  const r = await fetch(`${API_BASE}${caminho}`);
  if (!r.ok) throw new Error(`GET ${caminho} -> ${r.status}`);
  return r.status === 204 ? null : r.json();
}
async function apiPost(caminho, dados) {
  const r = await fetch(`${API_BASE}${caminho}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
  if (!r.ok) throw new Error(`POST ${caminho} -> ${r.status}`);
  return r.status === 204 ? null : r.json();
}
async function apiPut(caminho, dados) {
  const r = await fetch(`${API_BASE}${caminho}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
  if (!r.ok) throw new Error(`PUT ${caminho} -> ${r.status}`);
  return r.status === 204 ? null : r.json();
}
async function apiDelete(caminho) {
  const r = await fetch(`${API_BASE}${caminho}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`DELETE ${caminho} -> ${r.status}`);
}

async function checarStatusNuvem(elId = 'ind-nuvem') {
  const el = document.getElementById(elId);
  if (!el) return;
  try {
    const dados = await apiGet('/health');
    el.className = dados.status === 'ok' ? 'bolinha ok' : 'bolinha erro';
  } catch (err) {
    el.className = 'bolinha erro';
  }
}

const MAPA_ESCAPE_HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/[&<>"']/g, (ch) => MAPA_ESCAPE_HTML[ch]);
}

function formatarData(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarMoeda(valor) {
  const n = Number(valor || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function montarQueryDosFiltros(idsSelects) {
  const params = new URLSearchParams();
  for (const { id, campo } of idsSelects) {
    const el = document.getElementById(id);
    if (el && el.value) params.set(campo, el.value);
  }
  return params.toString();
}
