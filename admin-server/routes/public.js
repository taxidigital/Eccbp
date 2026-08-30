const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db');

const router = express.Router();

const pedidoOracaoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitos pedidos enviados. Tente novamente mais tarde.' },
});

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

router.get('/aconselhamento', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, titulo, descricao, video_url FROM aconselhamentos
     WHERE publicado = 1 ORDER BY ordem, id`
  );
  res.json({ aconselhamentos: rows });
});

router.get('/topicos-reconhecimento', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, titulo, texto FROM topicos_reconhecimento
     WHERE ativo = 1 ORDER BY ordem, id`
  );
  res.json({ topicos: rows });
});

router.get('/livros', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, titulo, autor, tema, comentarios, sugerido_por, imagem FROM livros
     WHERE publicado = 1 ORDER BY ordem, id`
  );
  res.json({ livros: rows });
});

router.post('/pedidos-oracao', pedidoOracaoLimiter, async (req, res) => {
  const { nome_casal, motivo, deseja_contato, telefone, whatsapp } = req.body || {};
  const nome = String(nome_casal || '').trim();
  if (!nome) {
    return res.status(400).json({ error: 'Informe o nome do casal.' });
  }
  if (nome.length > 120) {
    return res.status(400).json({ error: 'Nome do casal muito longo.' });
  }
  const querContato = !!deseja_contato;
  const tel = String(telefone || '').trim().slice(0, 30) || null;
  const wa = String(whatsapp || '').trim().slice(0, 30) || null;
  if (querContato && !tel && !wa) {
    return res.status(400).json({ error: 'Informe ao menos um telefone ou WhatsApp para contato.' });
  }

  await pool.query(
    `INSERT INTO pedidos_oracao (nome_casal, motivo, deseja_contato, telefone, whatsapp)
     VALUES (?, ?, ?, ?, ?)`,
    [nome, String(motivo || '').trim().slice(0, 4000) || null, querContato ? 1 : 0, querContato ? tel : null, querContato ? wa : null]
  );
  res.status(201).json({ ok: true });
});

module.exports = router;
