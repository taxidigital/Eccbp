const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermission, requireCsrf } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requirePermission('oracoes.gerenciar'));

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM pedidos_oracao ORDER BY atendido ASC, criado_em DESC'
  );
  res.json({ pedidos: rows });
});

router.put('/:id', requireCsrf, async (req, res) => {
  const { atendido } = req.body || {};
  if (atendido === undefined) return res.status(400).json({ error: 'Nada para atualizar.' });
  await pool.query('UPDATE pedidos_oracao SET atendido = ? WHERE id = ?', [atendido ? 1 : 0, req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', requireCsrf, async (req, res) => {
  await pool.query('DELETE FROM pedidos_oracao WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
