async function setupEncontro(user) {
  const card = document.getElementById('encontro-card');
  if (!user.permissoes.includes('encontro.editar')) { card.classList.add('hidden'); return; }
  const data = await api('/admin/api/encontro');
  const e = data.encontro || {};
  document.getElementById('e-data').value = e.data_texto || '';
  document.getElementById('e-local').value = e.local_texto || '';
  document.getElementById('e-preco').value = e.preco_texto || '';
  document.getElementById('e-parcelamento').value = e.parcelamento_texto || '';
  document.getElementById('e-link').value = e.link_inscricao || '';

  document.getElementById('encontro-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const msg = document.getElementById('encontro-msg');
    msg.textContent = '';
    try {
      await api('/admin/api/encontro', {
        method: 'PUT',
        body: JSON.stringify({
          data_texto: document.getElementById('e-data').value,
          local_texto: document.getElementById('e-local').value,
          preco_texto: document.getElementById('e-preco').value,
          parcelamento_texto: document.getElementById('e-parcelamento').value,
          link_inscricao: document.getElementById('e-link').value,
        }),
      });
      msg.textContent = 'Salvo com sucesso.';
    } catch (e2) {
      msg.textContent = e2.message;
    }
  });
}

async function setupContato(user) {
  const card = document.getElementById('contato-card');
  if (!user.permissoes.includes('contato.editar')) { card.classList.add('hidden'); return; }
  const data = await api('/admin/api/contato');
  const c = data.contato || {};
  document.getElementById('c-whatsapp').value = c.whatsapp || '';
  document.getElementById('c-email').value = c.email || '';

  document.getElementById('contato-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const msg = document.getElementById('contato-msg');
    msg.textContent = '';
    try {
      await api('/admin/api/contato', {
        method: 'PUT',
        body: JSON.stringify({
          whatsapp: document.getElementById('c-whatsapp').value,
          email: document.getElementById('c-email').value,
        }),
      });
      msg.textContent = 'Salvo com sucesso.';
    } catch (e2) {
      msg.textContent = e2.message;
    }
  });
}

function extractYouTubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function setupVideoPreview() {
  const input = document.getElementById('dep-video');
  const preview = document.getElementById('dep-video-preview');
  const msg = document.getElementById('dep-video-msg');

  input.addEventListener('input', () => {
    const value = input.value.trim();
    preview.innerHTML = '';
    preview.classList.add('hidden');
    msg.textContent = '';

    if (!value) return;
    const id = extractYouTubeId(value);
    if (!id) {
      msg.textContent = 'Isso não parece um link válido do YouTube (youtube.com ou youtu.be).';
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}`;
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0;';
    iframe.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    preview.appendChild(iframe);
    preview.classList.remove('hidden');
  });
}

async function setupDepoimentos(user) {
  const card = document.getElementById('depoimentos-card');
  if (!user.permissoes.includes('depoimentos.gerenciar')) { card.classList.add('hidden'); return; }

  async function reload() {
    const data = await api('/admin/api/depoimentos');
    const tbody = document.getElementById('dep-tbody');
    tbody.innerHTML = data.depoimentos.map((d) => `
      <tr>
        <td>${d.nome_casal}</td>
        <td>${d.video_url ? '🎥' : '—'}</td>
        <td>${d.autorizado ? '✅' : '—'}</td>
        <td>${d.publicado ? '✅' : '—'}</td>
        <td>
          <button class="btn-secondary" data-edit="${d.id}">Editar</button>
          <button class="btn-danger" data-del="${d.id}">Excluir</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openDepForm(data.depoimentos.find((d) => d.id == btn.dataset.edit)));
    });
    tbody.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este depoimento?')) return;
        await api(`/admin/api/depoimentos/${btn.dataset.del}`, { method: 'DELETE' });
        reload();
      });
    });
  }

  function openDepForm(dep) {
    document.getElementById('dep-form-card').classList.remove('hidden');
    document.getElementById('dep-form-msg').textContent = '';
    document.getElementById('dep-form').reset();
    document.getElementById('dep-id').value = dep ? dep.id : '';
    if (dep) {
      document.getElementById('dep-nome').value = dep.nome_casal;
      document.getElementById('dep-texto').value = dep.texto;
      document.getElementById('dep-video').value = dep.video_url || '';
      document.getElementById('dep-autorizado').checked = !!dep.autorizado;
      document.getElementById('dep-publicado').checked = !!dep.publicado;
    }
    document.getElementById('dep-video').dispatchEvent(new Event('input'));
  }

  setupVideoPreview();
  document.getElementById('new-dep-btn').addEventListener('click', () => openDepForm(null));
  document.getElementById('dep-cancel-btn').addEventListener('click', () => {
    document.getElementById('dep-form-card').classList.add('hidden');
  });

  document.getElementById('dep-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('dep-id').value;
    const body = {
      nome_casal: document.getElementById('dep-nome').value,
      texto: document.getElementById('dep-texto').value,
      video_url: document.getElementById('dep-video').value,
      autorizado: document.getElementById('dep-autorizado').checked,
      publicado: document.getElementById('dep-publicado').checked,
    };
    try {
      if (id) {
        await api(`/admin/api/depoimentos/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/admin/api/depoimentos', { method: 'POST', body: JSON.stringify(body) });
      }
      document.getElementById('dep-form-card').classList.add('hidden');
      reload();
    } catch (e2) {
      document.getElementById('dep-form-msg').textContent = e2.message;
    }
  });

  reload();
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await initShell('/admin/conteudo.html');
  if (!user) return;
  await setupEncontro(user);
  await setupContato(user);
  await setupDepoimentos(user);
});
