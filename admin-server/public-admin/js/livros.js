const CAPA_BASE = '/uploads/livros/';

// multipart não passa pelo helper api() (que força Content-Type JSON).
async function apiForm(path, method, formData) {
  const res = await fetch(path, {
    method,
    headers: CSRF_TOKEN ? { 'X-CSRF-Token': CSRF_TOKEN } : {},
    body: formData,
  });
  if (res.status === 401) {
    window.location.href = '/admin/login.html';
    throw new Error('Sessão expirada.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na requisição.');
  return data;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

async function setupLivros() {
  const form = document.getElementById('livro-form');
  const formCard = document.getElementById('form-card');
  const formTitle = document.getElementById('form-title');
  const formMsg = document.getElementById('form-msg');
  const fileInput = document.getElementById('f-imagem');
  const preview = document.getElementById('capa-preview');
  const previewImg = document.getElementById('capa-preview-img');
  const removerImagem = document.getElementById('f-remover-imagem');
  let livros = [];

  function resetForm() {
    form.reset();
    document.getElementById('livro-id').value = '';
    formMsg.textContent = '';
    preview.classList.add('hidden');
    previewImg.removeAttribute('src');
    removerImagem.checked = false;
    removerImagem.closest('.check-inline').style.display = 'none';
  }

  function openForm(livro) {
    resetForm();
    if (livro) {
      formTitle.textContent = 'Editar livro';
      document.getElementById('livro-id').value = livro.id;
      document.getElementById('f-titulo').value = livro.titulo || '';
      document.getElementById('f-autor').value = livro.autor || '';
      document.getElementById('f-tema').value = livro.tema || '';
      document.getElementById('f-sugerido').value = livro.sugerido_por || '';
      document.getElementById('f-comentarios').value = livro.comentarios || '';
      document.getElementById('f-publicado').checked = !!livro.publicado;
      if (livro.imagem) {
        previewImg.src = CAPA_BASE + livro.imagem;
        preview.classList.remove('hidden');
        removerImagem.closest('.check-inline').style.display = 'flex';
      }
    } else {
      formTitle.textContent = 'Novo livro';
    }
    formCard.classList.remove('hidden');
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    previewImg.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
    removerImagem.checked = false;
  });

  document.getElementById('novo-btn').addEventListener('click', () => openForm(null));
  document.getElementById('cancelar-btn').addEventListener('click', () => {
    formCard.classList.add('hidden');
    resetForm();
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    formMsg.textContent = '';
    const id = document.getElementById('livro-id').value;
    const fd = new FormData();
    fd.append('titulo', document.getElementById('f-titulo').value);
    fd.append('autor', document.getElementById('f-autor').value);
    fd.append('tema', document.getElementById('f-tema').value);
    fd.append('sugerido_por', document.getElementById('f-sugerido').value);
    fd.append('comentarios', document.getElementById('f-comentarios').value);
    fd.append('publicado', document.getElementById('f-publicado').checked ? '1' : '0');
    if (fileInput.files[0]) fd.append('imagem', fileInput.files[0]);
    if (id && removerImagem.checked && !fileInput.files[0]) fd.append('remover_imagem', '1');

    try {
      if (id) {
        await apiForm(`/admin/api/livros/${id}`, 'PUT', fd);
      } else {
        await apiForm('/admin/api/livros', 'POST', fd);
      }
      formCard.classList.add('hidden');
      resetForm();
      await reload();
    } catch (e) {
      formMsg.textContent = e.message;
    }
  });

  async function reload() {
    const data = await api('/admin/api/livros');
    livros = data.livros;
    const tbody = document.getElementById('livros-tbody');
    const table = document.getElementById('livros-table');
    const vazio = document.getElementById('livros-vazio');

    if (!livros.length) {
      table.classList.add('hidden');
      vazio.classList.remove('hidden');
      return;
    }
    table.classList.remove('hidden');
    vazio.classList.add('hidden');

    tbody.innerHTML = livros.map((l, i) => `
      <tr data-id="${l.id}">
        <td class="livro-ordem">
          <button data-mover="cima" data-id="${l.id}" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button data-mover="baixo" data-id="${l.id}" ${i === livros.length - 1 ? 'disabled' : ''}>↓</button>
        </td>
        <td>${l.imagem
          ? `<img class="livro-thumb" src="${CAPA_BASE}${esc(l.imagem)}" alt="" />`
          : '<span class="livro-thumb vazio"></span>'}</td>
        <td>${esc(l.titulo)}${l.autor ? `<br><small>${esc(l.autor)}</small>` : ''}</td>
        <td>${esc(l.tema) || '—'}</td>
        <td>${esc(l.sugerido_por) || '—'}</td>
        <td>${l.publicado ? '<span class="badge ativo">Sim</span>' : '<span class="badge inativo">Não</span>'}</td>
        <td>
          <button class="btn-secondary" data-edit="${l.id}">Editar</button>
          <button class="btn-danger" data-del="${l.id}">Excluir</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () =>
      openForm(livros.find((l) => l.id == b.dataset.edit))));
    tbody.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Excluir este livro da lista?')) return;
      await api(`/admin/api/livros/${b.dataset.del}`, { method: 'DELETE' });
      reload();
    }));
    tbody.querySelectorAll('[data-mover]').forEach((b) => b.addEventListener('click', async () => {
      await api(`/admin/api/livros/${b.dataset.id}/mover`, {
        method: 'PUT',
        body: JSON.stringify({ direcao: b.dataset.mover }),
      });
      reload();
    }));
  }

  await reload();
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await initShell('/admin/livros.html');
  if (!user) return;
  await setupLivros();
});
