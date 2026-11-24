const API_URL = 'api/imoveis.php';
let csrfToken = '';
const csrfReady = fetch('api/auth-api.php?action=csrf', {credentials:'same-origin'})
  .then(r => r.json()).then(data => { csrfToken = data.csrf || ''; })
  .catch(() => {});

const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

function showMessage(element, message, type = 'error') {
  if (!element) return;
  element.textContent = message;
  element.className = `feedback visible ${type}`;
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || 'Ocorreu um erro inesperado.');
  return data;
}

if (document.body.dataset.page === 'cadastro') {
  const form = document.querySelector('#property-form');
  const input = document.querySelector('#fotos');
  const preview = document.querySelector('#photo-preview');
  const feedback = document.querySelector('#form-feedback');
  const saveButton = document.querySelector('#save-button');
  let selectedFiles = [];

  function renderPhotos() {
    preview.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      const item = document.createElement('div');
      item.className = 'photo-item';
      item.innerHTML = `<img src="${url}" alt="${escapeHTML(file.name)}"><button type="button" class="remove-photo" aria-label="Remover foto ${index + 1}">×</button><span>${escapeHTML(file.name)}</span>`;
      item.querySelector('button').addEventListener('click', () => {
        selectedFiles.splice(index, 1);
        renderPhotos();
      });
      preview.appendChild(item);
    });
  }

  input.addEventListener('change', () => {
    const incoming = Array.from(input.files || []);
    const combined = [...selectedFiles, ...incoming];
    if (combined.length > 20) {
      showMessage(feedback, 'Você pode selecionar no máximo 20 fotos.');
      return;
    }
    const invalid = incoming.find(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) {
      showMessage(feedback, `A foto "${invalid.name}" é inválida ou ultrapassa 5 MB.`);
      input.value = '';
      return;
    }
    selectedFiles = combined;
    input.value = '';
    feedback.className = 'feedback';
    renderPhotos();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    feedback.className = 'feedback';
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');

    const address = form.endereco.value.trim();
    if (!address) {
      document.querySelector('[data-error-for="endereco"]').textContent = 'O endereço é obrigatório.';
      form.endereco.focus();
      return;
    }

    const data = new FormData();
    data.append('endereco', address);
    data.append('proprietario', form.proprietario.value.trim());
    data.append('inquilino', form.inquilino.value.trim());
    selectedFiles.forEach(file => data.append('fotos[]', file));

    await csrfReady;
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner"></span> Salvando...';
    try {
      const response = await fetch(API_URL, { method: 'POST', body: data, credentials: 'same-origin', headers: {'X-CSRF-Token': csrfToken} });
      const result = await readJson(response);
      window.location.href = `index.php?sucesso=${encodeURIComponent(result.message)}`;
    } catch (error) {
      showMessage(feedback, error.message);
      saveButton.disabled = false;
      saveButton.innerHTML = '<span>▣</span> Salvar';
    }
  });
}

if (document.body.dataset.page === 'lista') {
  const list = document.querySelector('#property-list');
  const feedback = document.querySelector('#feedback');
  const counter = document.querySelector('#property-count');
  const search = document.querySelector('#search');
  let properties = [];

  function renderList() {
    const q = search.value.trim().toLowerCase();
    counter.textContent = `${properties.length} imóvel(is) no sistema`;
    if (!properties.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">▤</div><p>Nenhum imóvel cadastrado ainda.</p><a href="cadastrar.php">Cadastrar primeiro imóvel</a></div>';
      return;
    }
    const filtered = properties.filter(p => [p.endereco, p.proprietario, p.inquilino].some(v => (v || '').toLowerCase().includes(q)));
    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state">Nenhum imóvel encontrado para essa busca.</div>';
      return;
    }
    list.innerHTML = filtered.map(item => `
      <article class="property-card">
        <div class="property-symbol">▤</div>
        <div class="property-info">
          <h2>${escapeHTML(item.endereco)}</h2>
          <p>Proprietário: ${escapeHTML(item.proprietario || 'Não informado')} | Inquilino: ${escapeHTML(item.inquilino || 'Não informado')}</p>
        </div>
        <a class="button primary small" href="imovel.php?id=${Number(item.id)}">Ver</a>
        <button class="icon-btn danger" type="button" data-delete="${Number(item.id)}" aria-label="Excluir imóvel">🗑</button>
      </article>`).join('');
  }

  async function loadProperties() {
    try {
      const result = await readJson(await fetch(API_URL, { credentials: 'same-origin' }));
      properties = result.imoveis;
      renderList();
    } catch (error) {
      list.innerHTML = `<div class="empty-state error-state">${escapeHTML(error.message)}<p>Confira se o Apache e o MySQL estão ativos e se o banco foi importado.</p></div>`;
    }
  }

  search.addEventListener('input', renderList);

  list.addEventListener('click', async event => {
    const button = event.target.closest('[data-delete]');
    if (!button) return;
    if (!confirm('Tem certeza de que deseja excluir este imóvel, suas vistorias e fotos?')) return;
    button.disabled = true;
    try {
      await csrfReady;
      const response = await fetch(`${API_URL}?id=${button.dataset.delete}`, { method: 'DELETE', credentials: 'same-origin', headers: {'X-CSRF-Token': csrfToken} });
      const data = await readJson(response);
      showMessage(feedback, data.message, 'success');
      loadProperties();
    } catch (error) {
      showMessage(feedback, error.message);
      button.disabled = false;
    }
  });

  const params = new URLSearchParams(window.location.search);
  if (params.has('sucesso')) showMessage(feedback, params.get('sucesso'), 'success');
  loadProperties();
}

// Encerramento de sessão disponível nas páginas protegidas.
document.querySelector('#logout-link')?.addEventListener('click', async event => {
  event.preventDefault();
  await csrfReady;
  try {
    const response = await fetch('api/auth-api.php?action=logout', {
      method: 'POST', credentials: 'same-origin',
      headers: {'Content-Type':'application/json','X-CSRF-Token':csrfToken},
      body: '{}'
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Não foi possível sair.');
    location.href = 'login.php';
  } catch (error) {
    alert(error.message);
  } 
});
