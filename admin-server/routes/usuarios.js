const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAuth, requirePermission, requireCsrf } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requirePermission('usuarios.gerenciar'));

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.nome, u.email, u.ativo, u.ultimo_login, u.criado_em, u.perfil_id, pf.nome AS perfil_nome
     FROM usuarios u JOIN perfis pf ON pf.id = u.perfil_id
     ORDER BY u.nome`
  );
  res.json({ usuarios: rows });
});

router.post('/', requireCsrf, async (req, res) => {
  const { nome, email, senha, perfil_id } = req.body || {};
  if (!nome || !email || !senha || !perfil_id) {
    return res.status(400).json({ error: 'nome, email, senha e perfil_id são obrigatórios.' });
  }
  if (senha.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter ao menos 8 caracteres.' });
  }
  const senha_hash = await bcrypt.hash(senha, 12);
  try {
    const [result] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, perfil_id) VALUES (?, ?, ?, ?)',
      [nome, email, senha_hash, perfil_id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Já existe um usuário com esse e-mail.' });
    }
    throw e;
  }
});

router.put('/:id', requireCsrf, async (req, res) => {
  const { nome, email, perfil_id, ativo, senha } = req.body || {};
  const fields = [];
  const values = [];
  if (nome !== undefined) { fields.push('nome = ?'); values.push(nome); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (perfil_id !== undefined) { fields.push('perfil_id = ?'); values.push(perfil_id); }
  if (ativo !== undefined) { fields.push('ativo = ?'); values.push(ativo ? 1 : 0); }
  if (senha) {
    if (senha.length < 8) return res.status(400).json({ error: 'A senha deve ter ao menos 8 caracteres.' });
    fields.push('senha_hash = ?');
    values.push(await bcrypt.hash(senha, 12));
  }
  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar.' });

  values.push(req.params.id);
  await pool.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
  res.json({ ok: true });
});

router.delete('/:id', requireCsrf, async (req, res) => {
  if (Number(req.params.id) === req.session.user.id) {
    return res.status(400).json({ error: 'Você não pode desativar seu próprio usuário.' });
  }
  await pool.query('UPDATE usuarios SET ativo = 0 WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
