document.getElementById('login-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const msg = document.getElementById('msg');
  msg.textContent = '';
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  try {
    const res = await fetch('/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.error || 'Falha ao entrar.';
      return;
    }
    window.location.href = '/admin/';
  } catch (e) {
    msg.textContent = 'Erro de conexão. Tente novamente.';
  }
});
