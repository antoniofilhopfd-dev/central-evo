const ROTULOS_TIPO_ARQUIVO = { drive: 'Drive', canva: 'Canva', documentos: 'Documentos', fotos: 'Fotos', outros: 'Outros' };

function renderArquivo(a) {
  return `
    <div class="tarefa-item" data-id="${a.id}">
      <div class="tarefa-info">
        <div class="tarefa-titulo">${a.favorito ? '⭐ ' : ''}${escapeHtml(a.nome)}</div>
        <div class="tarefa-meta">
          <span class="tag">${ROTULOS_TIPO_ARQUIVO[a.tipo]}</span>
          <span class="tag">${ROTULOS_SEGMENTO[a.segmento]}</span>
          ${a.usos > 0 ? `<span>Usado ${a.usos}x</span>` : ''}
        </div>
      </div>
      <div class="tarefa-acoes">
        <a class="btn-icone" href="${escapeHtml(a.link)}" target="_blank" rel="noopener noreferrer" onclick="registrarUso(${a.id})" title="Abrir">🔗</a>
        <button class="btn-icone" onclick="abrirEdicao(${a.id})" title="Editar">✏️</button>
      </div>
    </div>
  `;
}

async function registrarUso(id) {
  try { await apiPost(`/arquivos/${id}/abrir`, {}); } catch (e) { /* não bloqueia abertura do link */ }
}

async function carregarResumo() {
  const resumo = await apiGet('/arquivos/resumo');
  for (const tipo of Object.keys(ROTULOS_TIPO_ARQUIVO)) document.getElementById(`resumo-${tipo}`).textContent = resumo[tipo] || 0;
}

async function carregarImportantes() {
  const itens = await apiGet('/arquivos/destaque/importantes');
  document.getElementById('lista-importantes').innerHTML = itens.length
    ? itens.map(renderArquivo).join('')
    : '<p style="color:var(--texto-suave)">Nenhum link marcado como importante.</p>';
}

async function carregarLista() {
  const qs = montarQueryDosFiltros([{ id: 'filtro-categoria', campo: 'tipo' }, { id: 'filtro-segmento', campo: 'segmento' }]);
  let itens = await apiGet(`/arquivos${qs ? `?${qs}` : ''}`);
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  if (termo) {
    itens = itens.filter((a) => a.nome.toLowerCase().includes(termo) || (a.palavras_chave || '').toLowerCase().includes(termo));
  }
  document.getElementById('lista-arquivos').innerHTML = itens.length
    ? itens.map(renderArquivo).join('')
    : '<p style="color:var(--texto-suave)">Nenhum arquivo encontrado.</p>';
  carregarResumo();
  carregarImportantes();
}

function abrirModal(a = null) {
  document.getElementById('modal-titulo').textContent = a ? 'Editar arquivo' : 'Novo arquivo';
  document.getElementById('campo-id').value = a ? a.id : '';
  document.getElementById('campo-nome').value = a ? a.nome : '';
  document.getElementById('campo-tipo').value = a ? a.tipo : 'drive';
  document.getElementById('campo-segmento').value = a ? a.segmento : 'geral';
  document.getElementById('campo-link').value = a ? a.link : '';
  document.getElementById('campo-descricao').value = a ? (a.descricao || '') : '';
  document.getElementById('campo-palavras-chave').value = a ? (a.palavras_chave || '') : '';
  document.getElementById('campo-importante').checked = a ? a.importante : false;
  document.getElementById('campo-favorito').checked = a ? a.favorito : false;
  document.getElementById('btn-excluir').classList.toggle('oculto', !a);
  document.getElementById('modal').classList.remove('oculto');
}

async function abrirEdicao(id) {
  const itens = await apiGet(`/arquivos`);
  abrirModal(itens.find((a) => a.id === id));
}

document.getElementById('btn-novo').addEventListener('click', () => abrirModal());
document.getElementById('btn-cancelar').addEventListener('click', () => document.getElementById('modal').classList.add('oculto'));

document.getElementById('btn-salvar').addEventListener('click', async () => {
  const dados = {
    nome: document.getElementById('campo-nome').value.trim(),
    tipo: document.getElementById('campo-tipo').value,
    segmento: document.getElementById('campo-segmento').value,
    link: document.getElementById('campo-link').value.trim(),
    descricao: document.getElementById('campo-descricao').value || null,
    palavras_chave: document.getElementById('campo-palavras-chave').value || null,
    importante: document.getElementById('campo-importante').checked,
    favorito: document.getElementById('campo-favorito').checked,
  };
  if (!dados.nome || !dados.link) { alert('Nome e link são obrigatórios.'); return; }
  const id = document.getElementById('campo-id').value;
  if (id) await apiPut(`/arquivos/${id}`, dados); else await apiPost('/arquivos', dados);
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});

document.getElementById('btn-excluir').addEventListener('click', async () => {
  const id = document.getElementById('campo-id').value;
  if (!confirm('Excluir este arquivo?')) return;
  await apiDelete(`/arquivos/${id}`);
  document.getElementById('modal').classList.add('oculto');
  carregarLista();
});

document.getElementById('busca').addEventListener('input', carregarLista);
['filtro-categoria', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', carregarLista));

checarStatusNuvem();
carregarLista();
