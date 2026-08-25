let PERFIS_CACHE = [];

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleString('pt-BR');
}

async function loadPerfisOptions() {
  const data = await api('/admin/api/perfis');
  PERFIS_CACHE = data.perfis;
  const sel = document.getElementById('perfil_id');
  sel.innerHTML = data.perfis.map((p) => `<option value="${p.id}">${p.nome}</option>`).join('');
}

async function loadUsuarios() {
  const data = await api('/admin/api/usuarios');
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = data.usuarios.map((u) => `
    <tr>
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${u.perfil_nome}</td>
      <td><span class="badge ${u.ativo ? 'ativo' : 'inativo'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>${fmtDate(u.ultimo_login)}</td>
      <td>
        <button class="btn-secondary" data-edit="${u.id}">Editar</button>
        ${u.ativo ? `<button class="btn-danger" data-deactivate="${u.id}">Desativar</button>` : ''}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openForm(data.usuarios.find((u) => u.id == btn.dataset.edit)));
  });
  tbody.querySelectorAll('[data-deactivate]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Desativar este usuário?')) return;
      await api(`/admin/api/usuarios/${btn.dataset.deactivate}`, { method: 'DELETE' });
      loadUsuarios();
    });
  });
}

function openForm(user) {
  document.getElementById('form-card').classList.remove('hidden');
  document.getElementById('form-msg').textContent = '';
  document.getElementById('user-form').reset();
  if (user) {
    document.getElementById('form-title').textContent = 'Editar usuário';
    document.getElementById('user-id').value = user.id;
    document.getElementById('nome').value = user.nome;
    document.getElementById('email').value = user.email;
    document.getElementById('perfil_id').value = user.perfil_id;
    document.getElementById('senha-hint').textContent = '(deixe em branco para manter)';
  } else {
    document.getElementById('form-title').textContent = 'Novo usuário';
    document.getElementById('user-id').value = '';
    document.getElementById('senha-hint').textContent = '(mínimo 8 caracteres)';
  }
}

function closeForm() {
  document.getElementById('form-card').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await initShell('/admin/usuarios.html');
  if (!user) return;
  await loadPerfisOptions();
  await loadUsuarios();

  document.getElementById('new-user-btn').addEventListener('click', () => openForm(null));
  document.getElementById('cancel-btn').addEventListener('click', closeForm);

  document.getElementById('user-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('user-id').value;
    const body = {
      nome: document.getElementById('nome').value,
      email: document.getElementById('email').value,
      perfil_id: Number(document.getElementById('perfil_id').value),
    };
    const senha = document.getElementById('senha').value;
    if (senha) body.senha = senha;

    try {
      if (id) {
        await api(`/admin/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        if (!senha) throw new Error('Senha é obrigatória para novo usuário.');
        await api('/admin/api/usuarios', { method: 'POST', body: JSON.stringify(body) });
      }
      closeForm();
      loadUsuarios();
    } catch (e) {
      document.getElementById('form-msg').textContent = e.message;
    }
  });
});
