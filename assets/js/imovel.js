/* ========== Página do imóvel ========== */
if (document.body.dataset.page === 'imovel') {
  const imovelId = Number(new URLSearchParams(location.search).get('id'));
  const feedback = document.querySelector('#feedback');
  const fmtData = d => { const [y, m, dia] = String(d).slice(0, 10).split('-'); return `${dia}/${m}/${y}`; };

  document.querySelector('#btn-editar').href = `editar.php?id=${imovelId}`;

  async function carregar() {
    try {
      const d = await readJson(await fetch(`api/imovel.php?id=${imovelId}`, { credentials: 'same-origin' }));
      document.querySelector('#im-endereco').textContent = d.imovel.endereco;
      document.querySelector('#im-prop').textContent = d.imovel.proprietario || 'Não informado';
      document.querySelector('#im-inq').textContent = d.imovel.inquilino || 'Não informado';

      if (d.fotos.length) {
        document.querySelector('#card-fotos').hidden = false;
        document.querySelector('#im-fotos').innerHTML = d.fotos.map(f =>
          `<div class="thumb"><img src="${escapeHTML(f.caminho)}" alt="Foto do imóvel"></div>`).join('');
      }

      document.querySelector('#hist-count').textContent = d.vistorias.length;
      document.querySelector('#historico').innerHTML = d.vistorias.length
        ? d.vistorias.map(v => `
          <div class="history-item">
            <span class="badge badge-${v.tipo}">${v.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span>
            <div class="history-info">
              <strong>${fmtData(v.data_vistoria)}</strong>
              <small>${v.status === 'concluida' ? 'Concluída' : 'Em andamento'} · ${Number(v.total_comodos)} cômodos</small>
            </div>
            <a class="button secondary small" href="vistoria.php?id=${Number(v.id)}">Ver</a>
            ${v.status === 'concluida' ? `<a class="button primary small" href="laudo.php?id=${Number(v.id)}">📄 Laudo</a>` : ''}
          </div>`).join('')
        : '<p class="muted">Nenhuma vistoria realizada ainda.</p>';
    } catch (error) {
      showMessage(feedback, error.message);
    }
  }

  document.querySelectorAll('[data-novo]').forEach(btn => btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await csrfReady;
      const response = await fetch('api/vistorias.php?action=create', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ imovel_id: imovelId, tipo: btn.dataset.novo })
      });
      const d = await readJson(response);
      location.href = `vistoria.php?id=${d.id}`;
    } catch (error) {
      showMessage(feedback, error.message);
      btn.disabled = false;
    }
  }));

  carregar();
}

/* ========== Editar imóvel ========== */
if (document.body.dataset.page === 'editar') {
  const id = Number(new URLSearchParams(location.search).get('id'));
  const form = document.querySelector('#edit-form');
  const feedback = document.querySelector('#form-feedback');
  const saveButton = document.querySelector('#save-button');
  document.querySelector('#back-link').href = `imovel.php?id=${id}`;
  document.querySelector('#cancel-link').href = `imovel.php?id=${id}`;

  (async () => {
    try {
      const d = await readJson(await fetch(`api/imovel.php?id=${id}`, { credentials: 'same-origin' }));
      form.endereco.value = d.imovel.endereco;
      form.proprietario.value = d.imovel.proprietario || '';
      form.inquilino.value = d.imovel.inquilino || '';
    } catch (error) { showMessage(feedback, error.message); }
  })();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.endereco.value.trim()) { showMessage(feedback, 'O endereço é obrigatório.'); form.endereco.focus(); return; }
    saveButton.disabled = true;
    try {
      await csrfReady;
      const response = await fetch(`api/imovel.php?id=${id}`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ endereco: form.endereco.value, proprietario: form.proprietario.value, inquilino: form.inquilino.value })
      });
      await readJson(response);
      location.href = `imovel.php?id=${id}`;
    } catch (error) {
      showMessage(feedback, error.message);
      saveButton.disabled = false;
    }
  });
}