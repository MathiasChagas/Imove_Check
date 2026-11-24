if (document.body.dataset.page === 'laudo') {
  const LABELS = { excelente: 'Excelente', bom: 'Bom', regular: 'Regular', ruim: 'Ruim', funcionando: 'Funcionando', nao_funcionando: 'Não Funcionando', na: 'N/A' };
  const RANK = { excelente: 4, bom: 3, regular: 2, ruim: 1, funcionando: 2, nao_funcionando: 1 };
  const vid = Number(new URLSearchParams(location.search).get('id'));
  const feedback = document.querySelector('#feedback');
  const fmtData = d => { const [y, m, dia] = String(d).slice(0, 10).split('-'); return `${dia}/${m}/${y}`; };
  const chave = (comodo, item) => `${comodo}||${item}`.toLowerCase();
  const tag = c => c ? `<span class="tag tag-${c}">${LABELS[c]}</span>` : '<span class="muted">Não avaliado</span>';

  function comparar(atual, antigo) {
    if (!antigo) return { txt: 'Novo', cls: 'cmp-novo' };
    const a = RANK[atual.condicao], b = RANK[antigo.condicao];
    if (a == null || b == null || atual.tipo_opcao !== antigo.tipo_opcao) return { txt: '—', cls: '' };
    if (a < b) return { txt: 'Piorou', cls: 'cmp-pior' };
    if (a > b) return { txt: 'Melhorou', cls: 'cmp-melhor' };
    return { txt: 'Igual', cls: 'cmp-igual' };
  }

  function render(d) {
    const v = d.vistoria;
    const mapa = new Map();
    if (d.entrada) d.entrada.forEach(c => c.itens.forEach(i => mapa.set(chave(c.nome, i.nome), i)));
    const comparando = !!d.entrada;
    let pioraram = 0;

    const todos = d.comodos.flatMap(c => c.itens);
    const avaliados = todos.filter(i => i.condicao);
    const criticos = avaliados.filter(i => i.condicao === 'ruim' || i.condicao === 'nao_funcionando').length;
    const atencao = avaliados.filter(i => i.condicao === 'regular').length;

    const tabelas = d.comodos.map(c => {
      const linhas = c.itens.map(i => {
        let colEntrada = '', colVar = '';
        if (comparando) {
          const antigo = mapa.get(chave(c.nome, i.nome));
          const r = i.condicao ? comparar(i, antigo) : { txt: '—', cls: '' };
          if (r.cls === 'cmp-pior') pioraram++;
          colEntrada = `<td>${antigo && antigo.condicao ? tag(antigo.condicao) : '—'}</td>`;
          colVar = `<td>${r.cls ? `<span class="cmp ${r.cls}">${r.txt}</span>` : '—'}</td>`;
        }
        const fotos = i.fotos.length ? `<div class="laudo-fotos">${i.fotos.map(f => `<img src="${escapeHTML(f.caminho)}" alt="">`).join('')}</div>` : '';
        return `<tr><td>${escapeHTML(i.nome)}</td>${colEntrada}<td>${tag(i.condicao)}</td>${colVar}<td>${i.comentario ? escapeHTML(i.comentario) : '—'}${fotos}</td></tr>`;
      }).join('');
      return `
        <div class="laudo-comodo">
          <h4>${escapeHTML(c.nome)}</h4>
          <table>
            <thead><tr><th>Item</th>${comparando ? '<th>Entrada</th>' : ''}<th>Condição${comparando ? ' (Saída)' : ''}</th>${comparando ? '<th>Variação</th>' : ''}<th>Observações</th></tr></thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>`;
    }).join('');

    document.querySelector('#back-link').href = `imovel.php?id=${v.imovel_id}`;
    document.querySelector('#laudo').innerHTML = `
      <div class="laudo-head">
        <div>
          <h2>LAUDO DE VISTORIA</h2>
          <p>${v.tipo === 'entrada' ? 'Vistoria de Entrada' : 'Vistoria de Saída'}${v.status !== 'concluida' ? ' (em andamento)' : ''}</p>
        </div>
        <div class="right">Gerado em: ${new Date().toLocaleDateString('pt-BR')}<br>ImoveCheck</div>
      </div>

      <h3>Dados do imóvel</h3>
      <div class="dados">
        <div><span>Endereço:</span> <strong>${escapeHTML(v.endereco)}</strong></div>
        <div><span>Proprietário:</span> <strong>${escapeHTML(v.proprietario || 'Não informado')}</strong></div>
        <div><span>Inquilino:</span> <strong>${escapeHTML(v.inquilino || 'Não informado')}</strong></div>
        <div><span>Data da vistoria:</span> <strong>${fmtData(v.data_vistoria)}</strong></div>
      </div>

      <h3>Resumo</h3>
      <div class="resumo">
        <div><strong>${avaliados.length}</strong><span>Itens vistoriados</span></div>
        <div class="crit"><strong>${criticos}</strong><span>Problemas críticos</span></div>
        <div class="warn"><strong>${atencao}</strong><span>Atenção</span></div>
        ${comparando ? `<div class="crit"><strong>${pioraram}</strong><span>Itens que pioraram</span></div>` : ''}
      </div>
      ${v.tipo === 'saida' && !comparando ? '<p class="muted">Nenhuma vistoria de entrada encontrada para comparação.</p>' : ''}

      ${tabelas}

      ${v.observacoes ? `<h3>Observações gerais</h3><p>${escapeHTML(v.observacoes).replace(/\n/g, '<br>')}</p>` : ''}
      ${v.assinatura ? `<h3>Assinatura</h3><img class="laudo-assinatura" src="${escapeHTML(v.assinatura)}" alt="Assinatura">` : ''}`;
  }

  document.querySelector('#btn-print').addEventListener('click', () => window.print());

  (async () => {
    try {
      render(await readJson(await fetch(`api/vistorias.php?action=get&id=${vid}&laudo=1`, { credentials: 'same-origin' })));
    } catch (error) {
      showMessage(feedback, error.message);
      document.querySelector('#laudo').innerHTML = '';
    }
  })();
}