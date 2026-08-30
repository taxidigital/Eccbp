const { execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');

const execFileP = promisify(execFile);

// Onde as capas ficam guardadas — FORA de /opt/ecc, senão o `git reset --hard`
// do deploy automático apagaria os uploads a cada publicação.
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/opt/ecc-uploads/livros';

const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 8 * 1024 * 1024;

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Assinaturas de arquivo (defesa além do mimetype que o cliente manda).
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

/**
 * Recebe o buffer do upload, normaliza via ImageMagick e grava um JPEG em UPLOAD_DIR.
 * Retorna só o nome do arquivo (ex: "a1b2c3d4e5f6.jpg"). Lança Error com mensagem
 * amigável em caso de arquivo inválido.
 */
async function processarCapa(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('Arquivo de imagem vazio.');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('A imagem é muito grande (máximo 8 MB).');
  }
  if (!sniff(buffer)) {
    throw new Error('Envie uma imagem JPG, PNG ou WebP.');
  }

  ensureUploadDir();
  const nome = `${crypto.randomBytes(12).toString('hex')}.jpg`;
  const destino = path.join(UPLOAD_DIR, nome);
  const tmp = path.join(os.tmpdir(), `ecc-capa-${crypto.randomBytes(6).toString('hex')}`);
  fs.writeFileSync(tmp, buffer);

  try {
    // `jpg:` explícito no destino força o formato de saída pelo prefixo, não pela
    // extensão (evita bug já conhecido do ImageMagick com nomes intermediários).
    await execFileP('convert', [
      `${tmp}[0]`,
      '-auto-orient',
      '-strip',
      '-resize', '600x800>',
      '-background', 'white',
      '-flatten',
      '-quality', '82',
      '-interlace', 'Plane',
      `jpg:${destino}`,
    ]);
  } catch (err) {
    throw new Error('Não foi possível processar a imagem enviada.');
  } finally {
    fs.rmSync(tmp, { force: true });
  }

  // Otimização final in-place (opcional — não falha o upload se der errado).
  await execFileP('jpegoptim', ['-s', '--all-progressive', destino]).catch(() => {});

  return nome;
}

function removerCapa(nome) {
  if (!nome) return;
  // só o basename, nunca um path — evita path traversal
  const safe = path.basename(String(nome));
  fs.rmSync(path.join(UPLOAD_DIR, safe), { force: true });
}

module.exports = { processarCapa, removerCapa, ensureUploadDir, UPLOAD_DIR, ACCEPTED_MIME, MAX_BYTES };
