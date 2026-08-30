let CSRF_TOKEN = null;
let CURRENT_USER = null;

async function api(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (options.method && options.method !== 'GET' && CSRF_TOKEN) {
    headers['X-CSRF-Token'] = CSRF_TOKEN;
  }
  const res = await fetch(path, Object.assign({}, options, { headers }));
  if (res.status === 401) {
    window.location.href = '/admin/login.html';
    throw new Error('Sessão expirada.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro na requisição.');
  }
  return data;
}

const MENU_ITEMS = [
  { href: '/admin/dashboard.html', label: 'Início', perm: null },
  { href: '/admin/conteudo.html', label: 'Conteúdo do site', perm: ['encontro.editar', 'contato.editar', 'depoimentos.gerenciar', 'aconselhamento.gerenciar', 'reconhecimento.gerenciar'] },
  { href: '/admin/oracoes.html', label: 'Livro de Orações', perm: 'oracoes.gerenciar' },
  { href: '/admin/livros.html', label: 'Sugestões de leitura', perm: 'livros.gerenciar' },
  { href: '/admin/usuarios.html', label: 'Usuários', perm: 'usuarios.gerenciar' },
  { href: '/admin/perfis.html', label: 'Perfis e permissões', perm: 'usuarios.gerenciar' },
];

function hasPerm(user, perm) {
  if (!perm) return true;
  if (Array.isArray(perm)) return perm.some((p) => user.permissoes.includes(p));
  return user.permissoes.includes(perm);
}

async function initShell(activeHref) {
  const meRes = await fetch('/admin/api/me');
  if (meRes.status !== 200) {
    window.location.href = '/admin/login.html';
    return null;
  }
  const me = await meRes.json();
  CSRF_TOKEN = me.csrfToken;
  CURRENT_USER = me.user;

  const sidebar = document.getElementById('sidebar-nav');
  const userInfo = document.getElementById('user-info');
  if (userInfo) {
    userInfo.textContent = `${me.user.nome} · ${me.user.perfil_nome}`;
  }
  if (sidebar) {
    sidebar.innerHTML = '';
    MENU_ITEMS.filter((item) => hasPerm(me.user, item.perm)).forEach((item) => {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      if (item.href === activeHref) a.classList.add('active');
      sidebar.appendChild(a);
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api('/admin/api/logout', { method: 'POST' });
      window.location.href = '/admin/login.html';
    });
  }

  return me.user;
}
