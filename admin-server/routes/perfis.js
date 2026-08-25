const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requirePermission('usuarios.gerenciar'));

router.get('/', async (req, res) => {
  const [perfis] = await pool.query('SELECT id, nome, descricao FROM perfis ORDER BY nome');
  const [permissoes] = await pool.query('SELECT id, chave, descricao FROM permissoes ORDER BY chave');
  const [rel] = await pool.query('SELECT perfil_id, permissao_id FROM perfil_permissoes');
  res.json({ perfis, permissoes, perfil_permissoes: rel });
});

module.exports = router;
