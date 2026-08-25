const express = require('express');
const pool = require('../db');
const { requireAuth, requirePermission, requireCsrf } = require('../middleware/auth');
const { normalizeYouTubeUrl } = require('../lib/youtube');

const router = express.Router();

function resolveVideoUrl(video_url) {
  if (!video_url) return { ok: true, value: null };
  const normalized = normalizeYouTubeUrl(video_url);
  if (!normalized) {
    return { ok: false, error: 'O link de vídeo precisa ser uma URL válida do YouTube (youtube.com ou youtu.be).' };
  }
  return { ok: true, value: normalized };
}

// --- Encontro ---
router.get('/encontro', requireAuth, requirePermission('encontro.editar'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM encontro_config WHERE id = 1');
  res.json({ encontro: rows[0] || null });
});

router.put('/encontro', requireAuth, requirePermission('encontro.editar'), requireCsrf, async (req, res) => {
  const { data_texto, local_texto, preco_texto, parcelamento_texto, link_inscricao } = req.body || {};
  await pool.query(
    `INSERT INTO encontro_config (id, data_texto, local_texto, preco_texto, parcelamento_texto, link_inscricao, atualizado_por)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       data_texto = VALUES(data_texto), local_texto = VALUES(local_texto),
       preco_texto = VALUES(preco_texto), parcelamento_texto = VALUES(parcelamento_texto),
       link_inscricao = VALUES(link_inscricao), atualizado_por = VALUES(atualizado_por)`,
    [data_texto, local_texto, preco_texto, parcelamento_texto, link_inscricao, req.session.user.id]
  );
  res.json({ ok: true });
});

// --- Contato ---
router.get('/contato', requireAuth, requirePermission('contato.editar'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM contato_config WHERE id = 1');
  res.json({ contato: rows[0] || null });
});

router.put('/contato', requireAuth, requirePermission('contato.editar'), requireCsrf, async (req, res) => {
  const { whatsapp, email } = req.body || {};
  await pool.query(
    `INSERT INTO contato_config (id, whatsapp, email, atualizado_por)
     VALUES (1, ?, ?, ?)
     ON DUPLICATE KEY UPDATE whatsapp = VALUES(whatsapp), email = VALUES(email), atualizado_por = VALUES(atualizado_por)`,
    [whatsapp || null, email || null, req.session.user.id]
  );
  res.json({ ok: true });
});

// --- Depoimentos ---
router.get('/depoimentos', requireAuth, requirePermission('depoimentos.gerenciar'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM depoimentos ORDER BY ordem, id');
  res.json({ depoimentos: rows });
});

router.post('/depoimentos', requireAuth, requirePermission('depoimentos.gerenciar'), requireCsrf, async (req, res) => {
  const { nome_casal, texto, video_url, autorizado, publicado, ordem } = req.body || {};
  if (!nome_casal || !texto) {
    return res.status(400).json({ error: 'nome_casal e texto são obrigatórios.' });
  }
  const videoResolved = resolveVideoUrl(video_url);
  if (!videoResolved.ok) return res.status(400).json({ error: videoResolved.error });

  const [result] = await pool.query(
    `INSERT INTO depoimentos (nome_casal, texto, video_url, autorizado, publicado, ordem, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nome_casal, texto, videoResolved.value, autorizado ? 1 : 0, publicado ? 1 : 0, ordem || 0, req.session.user.id]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/depoimentos/:id', requireAuth, requirePermission('depoimentos.gerenciar'), requireCsrf, async (req, res) => {
  const { nome_casal, texto, video_url, autorizado, publicado, ordem } = req.body || {};
  const fields = [];
  const values = [];
  if (nome_casal !== undefined) { fields.push('nome_casal = ?'); values.push(nome_casal); }
  if (texto !== undefined) { fields.push('texto = ?'); values.push(texto); }
  if (video_url !== undefined) {
    const videoResolved = resolveVideoUrl(video_url);
    if (!videoResolved.ok) return res.status(400).json({ error: videoResolved.error });
    fields.push('video_url = ?'); values.push(videoResolved.value);
  }
  if (autorizado !== undefined) { fields.push('autorizado = ?'); values.push(autorizado ? 1 : 0); }
  if (publicado !== undefined) { fields.push('publicado = ?'); values.push(publicado ? 1 : 0); }
  if (ordem !== undefined) { fields.push('ordem = ?'); values.push(ordem); }
  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar.' });

  values.push(req.params.id);
  await pool.query(`UPDATE depoimentos SET ${fields.join(', ')} WHERE id = ?`, values);
  res.json({ ok: true });
});

router.delete('/depoimentos/:id', requireAuth, requirePermission('depoimentos.gerenciar'), requireCsrf, async (req, res) => {
  await pool.query('DELETE FROM depoimentos WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
