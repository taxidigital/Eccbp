function formatDataHora(iso) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function contatoTexto(p) {
  if (!p.deseja_contato) return '—';
  const partes = [];
  if (p.whatsapp) partes.push(`WhatsApp: ${p.whatsapp}`);
  if (p.telefone) partes.push(`Tel: ${p.telefone}`);
  return partes.length ? partes.join(' · ') : 'Deseja contato (sem número)';
}

async function setupOracoes() {
  async function reload() {
    const data = await api('/admin/api/pedidos-oracao');
    const tbody = document.getElementById('oracoes-tbody');
    const vazio = document.getElementById('oracoes-vazio');
    const table = document.getElementById('oracoes-table');

    if (!data.pedidos.length) {
      table.classList.add('hidden');
      vazio.classList.remove('hidden');
      return;
    }
    table.classList.remove('hidden');
    vazio.classList.add('hidden');

    tbody.innerHTML = data.pedidos.map((p) => `
      <tr class="oracao-row ${p.atendido ? 'is-atendido' : ''}" data-id="${p.id}">
        <td>${p.nome_casal}</td>
        <td class="oracao-motivo">${p.motivo ? p.motivo.replace(/</g, '&lt;') : '—'}</td>
        <td class="oracao-contato">${contatoTexto(p)}</td>
        <td>${formatDataHora(p.criado_em)}</td>
        <td>
          <label class="oracao-check">
            <input type="checkbox" data-atendido="${p.id}" ${p.atendido ? 'checked' : ''} />
            Orado
          </label>
        </td>
        <td><button class="btn-danger" data-del="${p.id}">Excluir</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-atendido]').forEach((chk) => {
      chk.addEventListener('change', async () => {
        await api(`/admin/api/pedidos-oracao/${chk.dataset.atendido}`, {
          method: 'PUT',
          body: JSON.stringify({ atendido: chk.checked }),
        });
        reload();
      });
    });
    tbody.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este pedido de oração?')) return;
        await api(`/admin/api/pedidos-oracao/${btn.dataset.del}`, { method: 'DELETE' });
        reload();
      });
    });
  }

  reload();
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await initShell('/admin/oracoes.html');
  if (!user) return;
  await setupOracoes(user);
});
