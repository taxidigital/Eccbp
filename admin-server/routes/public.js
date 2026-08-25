const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/encontro', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT data_texto, local_texto, preco_texto, parcelamento_texto, link_inscricao FROM encontro_config WHERE id = 1'
  );
  res.json(rows[0] || {});
});

router.get('/contato', async (req, res) => {
  const [rows] = await pool.query('SELECT whatsapp, email FROM contato_config WHERE id = 1');
  res.json(rows[0] || {});
});

router.get('/depoimentos', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, nome_casal, texto, video_url FROM depoimentos
     WHERE autorizado = 1 AND publicado = 1 ORDER BY ordem, id`
  );
  res.json({ depoimentos: rows });
});

module.exports = router;
