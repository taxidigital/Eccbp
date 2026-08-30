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

function setupVideoPreview(inputId, previewId, msgId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const msg = document.getElementById(msgId);

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

  setupVideoPreview('dep-video', 'dep-video-preview', 'dep-video-msg');
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

async function setupAconselhamento(user) {
  const card = document.getElementById('aconselhamento-card');
  if (!user.permissoes.includes('aconselhamento.gerenciar')) { card.classList.add('hidden'); return; }

  async function reload() {
    const data = await api('/admin/api/aconselhamentos');
    const tbody = document.getElementById('acon-tbody');
    tbody.innerHTML = data.aconselhamentos.map((a) => `
      <tr>
        <td>${a.titulo}</td>
        <td>${a.video_url ? '🎥' : '—'}</td>
        <td>${a.publicado ? '✅' : '—'}</td>
        <td>
          <button class="btn-secondary" data-edit="${a.id}">Editar</button>
          <button class="btn-danger" data-del="${a.id}">Excluir</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openAconForm(data.aconselhamentos.find((a) => a.id == btn.dataset.edit)));
    });
    tbody.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este vídeo de aconselhamento?')) return;
        await api(`/admin/api/aconselhamentos/${btn.dataset.del}`, { method: 'DELETE' });
        reload();
      });
    });
  }

  function openAconForm(acon) {
    document.getElementById('acon-form-card').classList.remove('hidden');
    document.getElementById('acon-form-msg').textContent = '';
    document.getElementById('acon-form').reset();
    document.getElementById('acon-id').value = acon ? acon.id : '';
    if (acon) {
      document.getElementById('acon-titulo').value = acon.titulo;
      document.getElementById('acon-descricao').value = acon.descricao || '';
      document.getElementById('acon-video').value = acon.video_url || '';
      document.getElementById('acon-publicado').checked = !!acon.publicado;
    }
    document.getElementById('acon-video').dispatchEvent(new Event('input'));
  }

  setupVideoPreview('acon-video', 'acon-video-preview', 'acon-video-msg');
  document.getElementById('new-acon-btn').addEventListener('click', () => openAconForm(null));
  document.getElementById('acon-cancel-btn').addEventListener('click', () => {
    document.getElementById('acon-form-card').classList.add('hidden');
  });

  document.getElementById('acon-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('acon-id').value;
    const body = {
      titulo: document.getElementById('acon-titulo').value,
      descricao: document.getElementById('acon-descricao').value,
      video_url: document.getElementById('acon-video').value,
      publicado: document.getElementById('acon-publicado').checked,
    };
    try {
      if (id) {
        await api(`/admin/api/aconselhamentos/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/admin/api/aconselhamentos', { method: 'POST', body: JSON.stringify(body) });
      }
      document.getElementById('acon-form-card').classList.add('hidden');
      reload();
    } catch (e2) {
      document.getElementById('acon-form-msg').textContent = e2.message;
    }
  });

  reload();
}

async function setupReconhecimento(user) {
  const card = document.getElementById('reconhecimento-card');
  if (!user.permissoes.includes('reconhecimento.gerenciar')) { card.classList.add('hidden'); return; }

  async function reload() {
    const data = await api('/admin/api/topicos-reconhecimento');
    const topicos = data.topicos;
    const tbody = document.getElementById('reco-tbody');
    tbody.innerHTML = topicos.map((t, i) => `
      <tr>
        <td style="white-space:nowrap;">
          <button class="btn-secondary" data-up="${t.id}" ${i === 0 ? 'disabled' : ''} title="Mover para cima">↑</button>
          <button class="btn-secondary" data-down="${t.id}" ${i === topicos.length - 1 ? 'disabled' : ''} title="Mover para baixo">↓</button>
        </td>
        <td>${t.titulo}</td>
        <td><input type="checkbox" data-ativo="${t.id}" ${t.ativo ? 'checked' : ''} style="width:auto;" /></td>
        <td>
          <button class="btn-secondary" data-edit="${t.id}">Editar</button>
          <button class="btn-danger" data-del="${t.id}">Excluir</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-up]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api(`/admin/api/topicos-reconhecimento/${btn.dataset.up}/mover`, { method: 'PUT', body: JSON.stringify({ direcao: 'cima' }) });
        reload();
      });
    });
    tbody.querySelectorAll('[data-down]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api(`/admin/api/topicos-reconhecimento/${btn.dataset.down}/mover`, { method: 'PUT', body: JSON.stringify({ direcao: 'baixo' }) });
        reload();
      });
    });
    tbody.querySelectorAll('[data-ativo]').forEach((chk) => {
      chk.addEventListener('change', async () => {
        await api(`/admin/api/topicos-reconhecimento/${chk.dataset.ativo}`, { method: 'PUT', body: JSON.stringify({ ativo: chk.checked }) });
        reload();
      });
    });
    tbody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openRecoForm(topicos.find((t) => t.id == btn.dataset.edit)));
    });
    tbody.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este tópico?')) return;
        await api(`/admin/api/topicos-reconhecimento/${btn.dataset.del}`, { method: 'DELETE' });
        reload();
      });
    });
  }

  function openRecoForm(topico) {
    document.getElementById('reco-form-card').classList.remove('hidden');
    document.getElementById('reco-form-msg').textContent = '';
    document.getElementById('reco-form').reset();
    document.getElementById('reco-id').value = topico ? topico.id : '';
    if (topico) {
      document.getElementById('reco-titulo').value = topico.titulo;
      document.getElementById('reco-texto').value = topico.texto;
      document.getElementById('reco-ativo').checked = !!topico.ativo;
    } else {
      document.getElementById('reco-ativo').checked = true;
    }
  }

  document.getElementById('new-reco-btn').addEventListener('click', () => openRecoForm(null));
  document.getElementById('reco-cancel-btn').addEventListener('click', () => {
    document.getElementById('reco-form-card').classList.add('hidden');
  });

  document.getElementById('reco-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = document.getElementById('reco-id').value;
    const body = {
      titulo: document.getElementById('reco-titulo').value,
      texto: document.getElementById('reco-texto').value,
      ativo: document.getElementById('reco-ativo').checked,
    };
    try {
      if (id) {
        await api(`/admin/api/topicos-reconhecimento/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/admin/api/topicos-reconhecimento', { method: 'POST', body: JSON.stringify(body) });
      }
      document.getElementById('reco-form-card').classList.add('hidden');
      reload();
    } catch (e2) {
      document.getElementById('reco-form-msg').textContent = e2.message;
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
  await setupAconselhamento(user);
  await setupReconhecimento(user);
});
