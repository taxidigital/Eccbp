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

// --- Aconselhamento ---
router.get('/aconselhamentos', requireAuth, requirePermission('aconselhamento.gerenciar'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM aconselhamentos ORDER BY ordem, id');
  res.json({ aconselhamentos: rows });
});

router.post('/aconselhamentos', requireAuth, requirePermission('aconselhamento.gerenciar'), requireCsrf, async (req, res) => {
  const { titulo, descricao, video_url, publicado, ordem } = req.body || {};
  if (!titulo || !video_url) {
    return res.status(400).json({ error: 'titulo e video_url são obrigatórios.' });
  }
  const videoResolved = resolveVideoUrl(video_url);
  if (!videoResolved.ok || !videoResolved.value) {
    return res.status(400).json({ error: videoResolved.error || 'O link de vídeo é obrigatório.' });
  }

  const [result] = await pool.query(
    `INSERT INTO aconselhamentos (titulo, descricao, video_url, publicado, ordem, criado_por)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [titulo, descricao || null, videoResolved.value, publicado ? 1 : 0, ordem || 0, req.session.user.id]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/aconselhamentos/:id', requireAuth, requirePermission('aconselhamento.gerenciar'), requireCsrf, async (req, res) => {
  const { titulo, descricao, video_url, publicado, ordem } = req.body || {};
  const fields = [];
  const values = [];
  if (titulo !== undefined) { fields.push('titulo = ?'); values.push(titulo); }
  if (descricao !== undefined) { fields.push('descricao = ?'); values.push(descricao || null); }
  if (video_url !== undefined) {
    const videoResolved = resolveVideoUrl(video_url);
    if (!videoResolved.ok || !videoResolved.value) {
      return res.status(400).json({ error: videoResolved.error || 'O link de vídeo é obrigatório.' });
    }
    fields.push('video_url = ?'); values.push(videoResolved.value);
  }
  if (publicado !== undefined) { fields.push('publicado = ?'); values.push(publicado ? 1 : 0); }
  if (ordem !== undefined) { fields.push('ordem = ?'); values.push(ordem); }
  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar.' });

  values.push(req.params.id);
  await pool.query(`UPDATE aconselhamentos SET ${fields.join(', ')} WHERE id = ?`, values);
  res.json({ ok: true });
});

router.delete('/aconselhamentos/:id', requireAuth, requirePermission('aconselhamento.gerenciar'), requireCsrf, async (req, res) => {
  await pool.query('DELETE FROM aconselhamentos WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// --- Tópicos de reconhecimento ---
router.get('/topicos-reconhecimento', requireAuth, requirePermission('reconhecimento.gerenciar'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM topicos_reconhecimento ORDER BY ordem, id');
  res.json({ topicos: rows });
});

router.post('/topicos-reconhecimento', requireAuth, requirePermission('reconhecimento.gerenciar'), requireCsrf, async (req, res) => {
  const { titulo, texto, ativo } = req.body || {};
  if (!titulo || !texto) {
    return res.status(400).json({ error: 'titulo e texto são obrigatórios.' });
  }
  const [[{ maxOrdem }]] = await pool.query('SELECT COALESCE(MAX(ordem), -1) AS maxOrdem FROM topicos_reconhecimento');
  const [result] = await pool.query(
    `INSERT INTO topicos_reconhecimento (titulo, texto, ativo, ordem, criado_por)
     VALUES (?, ?, ?, ?, ?)`,
    [titulo, texto, ativo === undefined ? 1 : (ativo ? 1 : 0), maxOrdem + 1, req.session.user.id]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/topicos-reconhecimento/:id', requireAuth, requirePermission('reconhecimento.gerenciar'), requireCsrf, async (req, res) => {
  const { titulo, texto, ativo } = req.body || {};
  const fields = [];
  const values = [];
  if (titulo !== undefined) { fields.push('titulo = ?'); values.push(titulo); }
  if (texto !== undefined) { fields.push('texto = ?'); values.push(texto); }
  if (ativo !== undefined) { fields.push('ativo = ?'); values.push(ativo ? 1 : 0); }
  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar.' });

  values.push(req.params.id);
  await pool.query(`UPDATE topicos_reconhecimento SET ${fields.join(', ')} WHERE id = ?`, values);
  res.json({ ok: true });
});

router.put('/topicos-reconhecimento/:id/mover', requireAuth, requirePermission('reconhecimento.gerenciar'), requireCsrf, async (req, res) => {
  const { direcao } = req.body || {};
  if (direcao !== 'cima' && direcao !== 'baixo') {
    return res.status(400).json({ error: 'direcao precisa ser "cima" ou "baixo".' });
  }
  const [rows] = await pool.query('SELECT id, ordem FROM topicos_reconhecimento ORDER BY ordem, id');
  const idx = rows.findIndex((r) => r.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Tópico não encontrado.' });
  const swapIdx = direcao === 'cima' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rows.length) return res.json({ ok: true }); // já está na ponta, nada a fazer

  const atual = rows[idx];
  const vizinho = rows[swapIdx];
  await pool.query('UPDATE topicos_reconhecimento SET ordem = ? WHERE id = ?', [vizinho.ordem, atual.id]);
  await pool.query('UPDATE topicos_reconhecimento SET ordem = ? WHERE id = ?', [atual.ordem, vizinho.id]);
  res.json({ ok: true });
});

router.delete('/topicos-reconhecimento/:id', requireAuth, requirePermission('reconhecimento.gerenciar'), requireCsrf, async (req, res) => {
  await pool.query('DELETE FROM topicos_reconhecimento WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
