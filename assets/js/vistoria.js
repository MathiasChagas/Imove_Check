if (document.body.dataset.page === 'vistoria') {
  const VAPI = 'api/vistorias.php';
  const LABELS = { excelente: 'Excelente', bom: 'Bom', regular: 'Regular', ruim: 'Ruim', funcionando: 'Funcionando', nao_funcionando: 'Não Funcionando', na: 'N/A' };
  const OPCOES = { estado: ['excelente', 'bom', 'regular', 'ruim'], funcionamento: ['funcionando', 'nao_funcionando', 'na'] };
  const vid = Number(new URLSearchParams(location.search).get('id'));
  const $ = selector => document.querySelector(selector);
  const feedback = $('#feedback');
  const listEl = $('#comodos');
  const aberto = new Set();
  let state = null;
  let fotoItemId = null;
  let itemComodoId = null;

  const fmtData = d => { const [y, m, dia] = String(d).slice(0, 10).split('-'); return `${dia}/${m}/${y}`; };

  async function vpost(action, payload = {}) {
    await csrfReady;
    const response = await fetch(`${VAPI}?action=${action}`, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(payload)
    });
    return readJson(response);
  }

  function achar(itemId) {
    for (const comodo of state.comodos) {
      const item = comodo.itens.find(i => i.id === itemId);
      if (item) return { comodo, item };
    }
    return null;
  }

  /* ---------- desenho da tela ---------- */
  function itemHTML(i) {
    const opcoes = OPCOES[i.tipo_opcao].map(o =>
      `<button type="button" class="opt ${i.condicao === o ? 'sel sel-' + o : ''}" data-cond="${i.id}" data-val="${o}">${LABELS[o]}</button>`).join('');
    const fotos = i.fotos.length
      ? `<div class="item-photos">${i.fotos.map(f => `<div class="thumb"><img src="${escapeHTML(f.caminho)}" alt="Foto de ${escapeHTML(i.nome)}"><button type="button" data-del-foto="${f.id}" aria-label="Remover foto">×</button></div>`).join('')}</div>`
      : '';
    return `
      <div class="item">
        <div class="item-top">
          <h3>${escapeHTML(i.nome)}</h3>
          <div>
            <button type="button" class="icon-btn ${i.comentario ? 'active' : ''}" data-comment="${i.id}" title="Comentário">💬</button>
            <button type="button" class="icon-btn ${i.fotos.length ? 'active' : ''}" data-photo="${i.id}" title="Adicionar foto">📷</button>
            <button type="button" class="icon-btn danger" data-del-item="${i.id}" title="Remover item">✕</button>
          </div>
        </div>
        <div class="options">${opcoes}</div>
        <textarea class="item-comment" data-comment-text="${i.id}" rows="2" placeholder="Comentário sobre este item..." ${i.comentario ? '' : 'hidden'}>${escapeHTML(i.comentario || '')}</textarea>
        ${fotos}
      </div>`;
  }

  function comodoHTML(c) {
    const total = c.itens.length;
    const ok = c.itens.filter(i => i.condicao).length;
    const pct = total ? Math.round(ok / total * 100) : 0;
    const open = aberto.has(c.id);
    return `
      <section class="comodo">
        <header class="comodo-head" data-toggle-comodo="${c.id}">
          <h2>${escapeHTML(c.nome)} <small>${ok}/${total} itens</small></h2>
          <div class="comodo-tools">
            <div class="bar"><span class="${pct === 100 ? 'done' : ''}" style="width:${pct}%"></span></div>
            ${total && ok === total ? '<span class="check">✓</span>' : ''}
            <button type="button" class="icon-btn danger" data-del-comodo="${c.id}" title="Excluir cômodo">🗑</button>
            <span class="chevron">${open ? '⌄' : '›'}</span>
          </div>
        </header>
        <div class="comodo-body" ${open ? '' : 'hidden'}>
          ${c.itens.map(itemHTML).join('')}
          <button type="button" class="add-link" data-add-item="${c.id}">＋ Adicionar item</button>
        </div>
      </section>`;
  }

  function atualizarProgresso() {
    const itens = state.comodos.flatMap(c => c.itens);
    const ok = itens.filter(i => i.condicao).length;
    const pct = itens.length ? Math.round(ok / itens.length * 100) : 0;
    $('#progress-pct').textContent = `${pct}%`;
    $('#progress-bar').style.width = `${pct}%`;
  }

  function render() {
    if (!state) return;
    const v = state.vistoria;
    const badge = $('#tipo-badge');
    badge.textContent = v.tipo === 'entrada' ? 'Vistoria de Entrada' : 'Vistoria de Saída';
    badge.className = `badge badge-${v.tipo}`;
    $('#vist-endereco').textContent = v.endereco;
    $('#vist-data').textContent = `Data: ${fmtData(v.data_vistoria)}`;
    $('#back-link').href = `imovel.php?id=${v.imovel_id}`;
    listEl.innerHTML = state.comodos.map(comodoHTML).join('');
    atualizarProgresso();
  }

  function renderAssinatura() {
    const img = $('#sign-preview');
    const tem = !!state.vistoria.assinatura;
    img.hidden = !tem;
    if (tem) img.src = state.vistoria.assinatura;
    $('#sign-open').textContent = tem ? 'Refazer' : 'Assinar';
  }

  /* ---------- cliques na lista de cômodos ---------- */
  listEl.addEventListener('click', async event => {
    const t = event.target;
    let el;
    try {
      if ((el = t.closest('[data-del-comodo]'))) {
        if (!confirm('Excluir este cômodo e todos os seus itens?')) return;
        const id = Number(el.dataset.delComodo);
        await vpost('del_comodo', { comodo_id: id });
        state.comodos = state.comodos.filter(c => c.id !== id);
        render(); return;
      }
      if ((el = t.closest('[data-cond]'))) {
        const id = Number(el.dataset.cond);
        const { item } = achar(id);
        const nova = item.condicao === el.dataset.val ? null : el.dataset.val; // clicar de novo desmarca
        await vpost('set_condicao', { item_id: id, condicao: nova });
        item.condicao = nova;
        render(); return;
      }
      if ((el = t.closest('[data-comment]'))) {
        const ta = listEl.querySelector(`[data-comment-text="${el.dataset.comment}"]`);
        ta.hidden = !ta.hidden;
        if (!ta.hidden) ta.focus();
        return;
      }
      if ((el = t.closest('[data-photo]'))) {
        fotoItemId = Number(el.dataset.photo);
        $('#foto-input').click(); return;
      }
      if ((el = t.closest('[data-del-foto]'))) {
        const fid = Number(el.dataset.delFoto);
        await vpost('del_foto', { foto_id: fid });
        state.comodos.forEach(c => c.itens.forEach(i => { i.fotos = i.fotos.filter(f => f.id !== fid); }));
        render(); return;
      }
      if ((el = t.closest('[data-del-item]'))) {
        if (!confirm('Remover este item?')) return;
        const id = Number(el.dataset.delItem);
        await vpost('del_item', { item_id: id });
        state.comodos.forEach(c => { c.itens = c.itens.filter(i => i.id !== id); });
        render(); return;
      }
      if ((el = t.closest('[data-add-item]'))) {
        itemComodoId = Number(el.dataset.addItem);
        $('#form-item').reset();
        $('#dlg-item').showModal();
        $('#item-nome').focus(); return;
      }
      if ((el = t.closest('[data-toggle-comodo]'))) {
        const id = Number(el.dataset.toggleComodo);
        aberto.has(id) ? aberto.delete(id) : aberto.add(id);
        render();
      }
    } catch (error) {
      showMessage(feedback, error.message);
    }
  });

  // salvar comentário do item (ao sair do campo)
  listEl.addEventListener('change', async event => {
    const ta = event.target.closest('[data-comment-text]');
    if (!ta) return;
    const id = Number(ta.dataset.commentText);
    const texto = ta.value.trim();
    try {
      await vpost('set_comentario', { item_id: id, comentario: texto });
      achar(id).item.comentario = texto || null;
      listEl.querySelector(`[data-comment="${id}"]`).classList.toggle('active', !!texto);
    } catch (error) { showMessage(feedback, error.message); }
  });

  /* ---------- fotos do item ---------- */
  $('#foto-input').addEventListener('change', async event => {
    const files = Array.from(event.target.files);
    event.target.value = '';
    const found = achar(fotoItemId);
    if (!found) return;
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        showMessage(feedback, `A foto "${file.name}" é inválida ou ultrapassa 5 MB.`);
        continue;
      }
      try {
        await csrfReady;
        const fd = new FormData();
        fd.append('item_id', fotoItemId);
        fd.append('foto', file);
        const response = await fetch(`${VAPI}?action=upload_foto`, { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrfToken }, body: fd });
        const d = await readJson(response);
        found.item.fotos.push(d.foto);
        render();
      } catch (error) { showMessage(feedback, error.message); }
    }
  });

  /* ---------- adicionar item / cômodo ---------- */
  $('#form-item').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const d = await vpost('add_item', { comodo_id: itemComodoId, nome: $('#item-nome').value.trim(), tipo_opcao: $('#item-tipo').value });
      state.comodos.find(c => c.id === itemComodoId).itens.push(d.item);
      $('#dlg-item').close();
      render();
    } catch (error) { showMessage(feedback, error.message); $('#dlg-item').close(); }
  });

  $('#add-comodo').addEventListener('click', async () => {
    const nome = prompt('Nome do novo cômodo (ex.: Quarto 2, Varanda):');
    if (!nome || !nome.trim()) return;
    try {
      const d = await vpost('add_comodo', { vistoria_id: vid, nome: nome.trim() });
      state.comodos.push(d.comodo);
      aberto.add(d.comodo.id);
      render();
    } catch (error) { showMessage(feedback, error.message); }
  });

  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

  /* ---------- observações gerais ---------- */
  $('#observacoes').addEventListener('change', async event => {
    try { await vpost('set_obs', { vistoria_id: vid, observacoes: event.target.value }); }
    catch (error) { showMessage(feedback, error.message); }
  });

  /* ---------- assinatura digital (canvas) ---------- */
  const canvas = $('#sign-canvas');
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#10213d';
  let desenhando = false, temTraco = false;

  const pos = e => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
  };
  canvas.addEventListener('pointerdown', e => {
    desenhando = true; canvas.setPointerCapture(e.pointerId);
    const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener('pointermove', e => {
    if (!desenhando) return;
    const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); temTraco = true;
  });
  ['pointerup', 'pointercancel'].forEach(tipo => canvas.addEventListener(tipo, () => { desenhando = false; }));

  const limparCanvas = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); temTraco = false; };
  $('#sign-clear').addEventListener('click', limparCanvas);
  $('#sign-open').addEventListener('click', () => { limparCanvas(); $('#dlg-sign').showModal(); });
  $('#sign-save').addEventListener('click', async () => {
    if (!temTraco) { alert('Desenhe sua assinatura antes de salvar.'); return; }
    try {
      const data = canvas.toDataURL('image/png');
      await vpost('set_assinatura', { vistoria_id: vid, assinatura: data });
      state.vistoria.assinatura = data;
      renderAssinatura();
      $('#dlg-sign').close();
    } catch (error) { showMessage(feedback, error.message); }
  });

  /* ---------- concluir ---------- */
  async function concluir() {
    const pendentes = state.comodos.reduce((n, c) => n + c.itens.filter(i => !i.condicao).length, 0);
    if (pendentes && !confirm(`Ainda há ${pendentes} item(ns) sem avaliação. Concluir mesmo assim?`)) return;
    try {
      await vpost('concluir', { vistoria_id: vid });
      location.href = `laudo.php?id=${vid}`;
    } catch (error) { showMessage(feedback, error.message); }
  }
  $('#btn-concluir').addEventListener('click', concluir);
  $('#btn-concluir-top').addEventListener('click', concluir);

  /* ---------- carga inicial ---------- */
  (async () => {
    try {
      const d = await readJson(await fetch(`${VAPI}?action=get&id=${vid}`, { credentials: 'same-origin' }));
      state = { vistoria: d.vistoria, comodos: d.comodos };
      if (state.comodos.length) aberto.add(state.comodos[0].id);
      $('#observacoes').value = state.vistoria.observacoes || '';
      render();
      renderAssinatura();
    } catch (error) {
      showMessage(feedback, error.message);
    }
  })();
}