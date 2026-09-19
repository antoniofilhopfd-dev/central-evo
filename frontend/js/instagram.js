const NOME_CONTA = { evolucaopb: '@evolucaopb', geracaoevolucao: '@geracaoevolucao' };
const ROTULO_TIPO_IG = { post: 'Post', reels: 'Reels', story: 'Story' };

function filtrosAtuais() {
  return montarQueryDosFiltros([
    { id: 'filtro-conta', campo: 'conta' }, { id: 'filtro-periodo', campo: 'periodo' },
    { id: 'filtro-tipo', campo: 'tipo' }, { id: 'filtro-segmento', campo: 'segmento' },
  ]);
}

async function carregarResumo() {
  const qs = filtrosAtuais();
  const r = await apiGet(`/instagram/resumo${qs ? `?${qs}` : ''}`);
  document.getElementById('ig-conteudos').textContent = r.conteudos;
  document.getElementById('ig-alcance').textContent = r.alcance;
  document.getElementById('ig-engajamentos').textContent = r.engajamentos;
  document.getElementById('ig-taxa').textContent = `${r.taxa_media}%`;
  document.getElementById('ig-seguidores').textContent = r.seguidores_ganhos;
}

async function carregarComparativo() {
  const periodo = document.getElementById('filtro-periodo').value;
  const dados = await apiGet(`/instagram/comparativo-contas${periodo ? `?periodo=${periodo}` : ''}`);
  const contas = ['evolucaopb', 'geracaoevolucao'];
  const linhas = contas.map((c) => dados.find((d) => d.conta === c) || { conta: c, conteudos: 0, alcance: 0, engajamentos: 0, seguidores_ganhos: 0, taxa_media: 0 });
  document.getElementById('tabela-comparativo').innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
      <thead><tr style="text-align:left;border-bottom:2px solid var(--cinza-borda)">
        <th style="padding:6px">Conta</th><th>Conteúdos</th><th>Alcance</th><th>Engajamentos</th><th>Taxa média</th><th>Seg. ganhos</th>
      </tr></thead>
      <tbody>
        ${linhas.map((l) => `
          <tr style="border-bottom:1px solid var(--cinza-borda)">
            <td style="padding:6px;font-weight:600">${NOME_CONTA[l.conta]}</td>
            <td>${l.conteudos}</td><td>${l.alcance}</td><td>${l.engajamentos}</td><td>${l.taxa_media}%</td><td>${l.seguidores_ganhos}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function carregarRanking() {
  const qs = filtrosAtuais();
  const itens = await apiGet(`/instagram/ranking${qs ? `?${qs}` : ''}`);
  document.getElementById('lista-ranking').innerHTML = itens.length
    ? itens.map((it, i) => `
      <div class="tarefa-item">
        <div class="tarefa-info">
          <div class="tarefa-titulo">#${i + 1} ${it.titulo}</div>
          <div class="tarefa-meta">
            <span class="tag">${NOME_CONTA[it.conta]}</span>
            <span class="tag">${ROTULO_TIPO_IG[it.tipo]}</span>
            <span>📅 ${formatarData(it.data)}</span>
            <span>❤️ ${it.engajamento} engaj.</span>
            <span>👁️ ${it.alcance} alcance</span>
          </div>
        </div>
        ${it.link ? `<div class="tarefa-acoes"><a class="btn-icone" href="${it.link}" target="_blank">🔗</a></div>` : ''}
      </div>
    `).join('')
    : '<p style="color:var(--texto-suave)">Nenhum conteúdo cadastrado ainda.</p>';
}

function atualizarTudo() {
  carregarResumo();
  carregarComparativo();
  carregarRanking();
}

['filtro-conta', 'filtro-periodo', 'filtro-tipo', 'filtro-segmento'].forEach((id) => document.getElementById(id).addEventListener('change', atualizarTudo));

document.getElementById('btn-novo-conteudo').addEventListener('click', () => document.getElementById('modal-conteudo').classList.remove('oculto'));
document.getElementById('btn-salvar-conteudo').addEventListener('click', async () => {
  const dados = {
    conta: document.getElementById('c-conta').value,
    data: document.getElementById('c-data').value,
    tipo: document.getElementById('c-tipo').value,
    segmento: document.getElementById('c-segmento').value,
    titulo: document.getElementById('c-titulo').value.trim(),
    alcance: document.getElementById('c-alcance').value || 0,
    impressoes: document.getElementById('c-impressoes').value || 0,
    curtidas: document.getElementById('c-curtidas').value || 0,
    comentarios: document.getElementById('c-comentarios').value || 0,
    compartilhamentos: document.getElementById('c-compartilhamentos').value || 0,
    salvamentos: document.getElementById('c-salvamentos').value || 0,
    cliques: document.getElementById('c-cliques').value || 0,
    visualizacoes: document.getElementById('c-visualizacoes').value || 0,
    seguidores_ganhos: document.getElementById('c-seguidores-ganhos').value || 0,
    link: document.getElementById('c-link').value || null,
    observacoes: document.getElementById('c-observacoes').value || null,
  };
  if (!dados.data || !dados.titulo) { alert('Data e título são obrigatórios.'); return; }
  await apiPost('/instagram/conteudos', dados);
  document.getElementById('modal-conteudo').classList.add('oculto');
  atualizarTudo();
});

document.getElementById('btn-nova-metrica').addEventListener('click', () => document.getElementById('modal-metrica').classList.remove('oculto'));
document.getElementById('btn-salvar-metrica').addEventListener('click', async () => {
  const dados = {
    conta: document.getElementById('m-conta').value,
    data_inicial: document.getElementById('m-data-inicial').value,
    data_final: document.getElementById('m-data-final').value,
    seguidores_final: document.getElementById('m-seguidores-final').value || 0,
    alcance: document.getElementById('m-alcance').value || 0,
    impressoes: document.getElementById('m-impressoes').value || 0,
    visitas_perfil: document.getElementById('m-visitas').value || 0,
    interacoes: document.getElementById('m-interacoes').value || 0,
    cliques_link: document.getElementById('m-cliques-link').value || 0,
    seguidores_ganhos: document.getElementById('m-seguidores-ganhos').value || 0,
    seguidores_perdidos: document.getElementById('m-seguidores-perdidos').value || 0,
    posts_publicados: document.getElementById('m-posts').value || 0,
    reels_publicados: document.getElementById('m-reels').value || 0,
    stories_publicados: document.getElementById('m-stories').value || 0,
    observacoes: document.getElementById('m-observacoes').value || null,
  };
  if (!dados.data_inicial || !dados.data_final) { alert('Datas são obrigatórias.'); return; }
  await apiPost('/instagram/metricas-conta', dados);
  document.getElementById('modal-metrica').classList.add('oculto');
});

checarStatusNuvem();
atualizarTudo();
