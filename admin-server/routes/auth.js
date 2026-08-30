const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' },
});

async function loadPermissoes(perfilId) {
  const [rows] = await pool.query(
    `SELECT p.chave FROM permissoes p
     JOIN perfil_permissoes pp ON pp.permissao_id = p.id
     WHERE pp.perfil_id = ?`,
    [perfilId]
  );
  return rows.map((r) => r.chave);
}

router.post('/login', loginLimiter, async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.nome, u.email, u.senha_hash, u.ativo, u.perfil_id, pf.nome AS perfil_nome
     FROM usuarios u JOIN perfis pf ON pf.id = u.perfil_id
     WHERE u.email = ? LIMIT 1`,
    [email]
  );
  const user = rows[0];
  if (!user || !user.ativo) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const ok = await bcrypt.compare(senha, user.senha_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const permissoes = await loadPermissoes(user.perfil_id);

  req.session.regenerate(async (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao iniciar sessão.' });

    req.session.user = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil_id: user.perfil_id,
      perfil_nome: user.perfil_nome,
      permissoes,
    };
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');

    await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [user.id]);

    res.json({ user: req.session.user, csrfToken: req.session.csrfToken });
  });
});

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('ecc.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, async (req, res) => {
  // recarrega as permissões do banco a cada chamada: evita sessão presa com
  // permissões antigas quando um perfil ganha/perde acesso após o login
  req.session.user.permissoes = await loadPermissoes(req.session.user.perfil_id);
  res.json({ user: req.session.user, csrfToken: req.session.csrfToken });
});

module.exports = router;
