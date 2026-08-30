const express = require('express');
const multer = require('multer');
const pool = require('../db');
const { requireAuth, requirePermission, requireCsrf } = require('../middleware/auth');
const { processarCapa, removerCapa } = require('../lib/imagem');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

router.use(requireAuth, requirePermission('livros.gerenciar'));

// multer lança MulterError (ex: LIMIT_FILE_SIZE) — traduz pra 400 amigável.
function comUpload(req, res, next) {
  upload.single('imagem')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'A imagem é muito grande (máximo 8 MB).'
        : 'Falha ao receber a imagem enviada.';
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

function limpar(str, max) {
  const v = String(str == null ? '' : str).trim();
  return v ? v.slice(0, max) : null;
}
const truthy = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'on';

router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM livros ORDER BY ordem, id');
  res.json({ livros: rows });
});

router.post('/', requireCsrf, comUpload, async (req, res) => {
  const titulo = limpar(req.body.titulo, 200);
  if (!titulo) return res.status(400).json({ error: 'O título é obrigatório.' });

  let imagem = null;
  if (req.file) {
    try {
      imagem = await processarCapa(req.file.buffer);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  const [[{ maxOrdem }]] = await pool.query('SELECT COALESCE(MAX(ordem), -1) AS maxOrdem FROM livros');
  const [result] = await pool.query(
    `INSERT INTO livros (titulo, autor, tema, comentarios, sugerido_por, imagem, publicado, ordem, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      titulo,
      limpar(req.body.autor, 160),
      limpar(req.body.tema, 120),
      limpar(req.body.comentarios, 4000),
      limpar(req.body.sugerido_por, 160),
      imagem,
      truthy(req.body.publicado) ? 1 : 0,
      maxOrdem + 1,
      req.session.user.id,
    ]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/:id', requireCsrf, comUpload, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM livros WHERE id = ?', [req.params.id]);
  const livro = rows[0];
  if (!livro) return res.status(404).json({ error: 'Livro não encontrado.' });

  const fields = [];
  const values = [];
  const set = (col, val) => { fields.push(`${col} = ?`); values.push(val); };

  if (req.body.titulo !== undefined) {
    const titulo = limpar(req.body.titulo, 200);
    if (!titulo) return res.status(400).json({ error: 'O título é obrigatório.' });
    set('titulo', titulo);
  }
  if (req.body.autor !== undefined) set('autor', limpar(req.body.autor, 160));
  if (req.body.tema !== undefined) set('tema', limpar(req.body.tema, 120));
  if (req.body.comentarios !== undefined) set('comentarios', limpar(req.body.comentarios, 4000));
  if (req.body.sugerido_por !== undefined) set('sugerido_por', limpar(req.body.sugerido_por, 160));
  if (req.body.publicado !== undefined) set('publicado', truthy(req.body.publicado) ? 1 : 0);
  if (truthy(req.body.remover_imagem)) set('imagem', null);

  let novaImagem = null;
  if (req.file) {
    try {
      novaImagem = await processarCapa(req.file.buffer);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    set('imagem', novaImagem);
  }

  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar.' });

  values.push(req.params.id);
  await pool.query(`UPDATE livros SET ${fields.join(', ')} WHERE id = ?`, values);

  // remove o arquivo antigo se foi trocado ou removido
  if ((novaImagem || truthy(req.body.remover_imagem)) && livro.imagem && livro.imagem !== novaImagem) {
    removerCapa(livro.imagem);
  }
  res.json({ ok: true });
});

router.put('/:id/mover', requireCsrf, async (req, res) => {
  const { direcao } = req.body || {};
  if (direcao !== 'cima' && direcao !== 'baixo') {
    return res.status(400).json({ error: 'direcao precisa ser "cima" ou "baixo".' });
  }
  const [rows] = await pool.query('SELECT id, ordem FROM livros ORDER BY ordem, id');
  const idx = rows.findIndex((r) => r.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Livro não encontrado.' });
  const swapIdx = direcao === 'cima' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rows.length) return res.json({ ok: true });

  const atual = rows[idx];
  const vizinho = rows[swapIdx];
  await pool.query('UPDATE livros SET ordem = ? WHERE id = ?', [vizinho.ordem, atual.id]);
  await pool.query('UPDATE livros SET ordem = ? WHERE id = ?', [atual.ordem, vizinho.id]);
  res.json({ ok: true });
});

router.delete('/:id', requireCsrf, async (req, res) => {
  const [rows] = await pool.query('SELECT imagem FROM livros WHERE id = ?', [req.params.id]);
  await pool.query('DELETE FROM livros WHERE id = ?', [req.params.id]);
  if (rows[0]) removerCapa(rows[0].imagem);
  res.json({ ok: true });
});

module.exports = router;
