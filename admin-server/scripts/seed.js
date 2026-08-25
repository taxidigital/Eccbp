require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'rodrigo@taxidigital.net';

const PERMISSOES = [
  ['usuarios.gerenciar', 'Gerenciar usuários e perfis de acesso'],
  ['encontro.editar', 'Editar dados do próximo encontro (data, local, preço, inscrição)'],
  ['contato.editar', 'Editar canal de contato (WhatsApp/e-mail)'],
  ['depoimentos.gerenciar', 'Gerenciar depoimentos de casais'],
];

const PERFIS = [
  ['Administrador', 'Acesso total, incluindo gerenciamento de usuários e perfis'],
  ['Editor', 'Gerencia conteúdo do site, sem acesso a usuários/perfis'],
];

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pass = '';
  const bytes = crypto.randomBytes(20);
  for (let i = 0; i < 20; i++) pass += chars[bytes[i] % chars.length];
  return pass;
}

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS perfis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(50) NOT NULL UNIQUE,
      descricao VARCHAR(255),
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS permissoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chave VARCHAR(100) NOT NULL UNIQUE,
      descricao VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS perfil_permissoes (
      perfil_id INT NOT NULL,
      permissao_id INT NOT NULL,
      PRIMARY KEY (perfil_id, permissao_id),
      FOREIGN KEY (perfil_id) REFERENCES perfis(id) ON DELETE CASCADE,
      FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      senha_hash VARCHAR(255) NOT NULL,
      perfil_id INT NOT NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      ultimo_login DATETIME NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (perfil_id) REFERENCES perfis(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS encontro_config (
      id INT PRIMARY KEY,
      data_texto VARCHAR(100),
      local_texto VARCHAR(255),
      preco_texto VARCHAR(50),
      parcelamento_texto VARCHAR(255),
      link_inscricao VARCHAR(500),
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      atualizado_por INT NULL,
      FOREIGN KEY (atualizado_por) REFERENCES usuarios(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contato_config (
      id INT PRIMARY KEY,
      whatsapp VARCHAR(30) NULL,
      email VARCHAR(190) NULL,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      atualizado_por INT NULL,
      FOREIGN KEY (atualizado_por) REFERENCES usuarios(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS depoimentos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome_casal VARCHAR(120) NOT NULL,
      texto TEXT NOT NULL,
      video_url VARCHAR(500) NULL,
      autorizado TINYINT(1) NOT NULL DEFAULT 0,
      publicado TINYINT(1) NOT NULL DEFAULT 0,
      ordem INT NOT NULL DEFAULT 0,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      criado_por INT NULL,
      FOREIGN KEY (criado_por) REFERENCES usuarios(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function seedPerfisEPermissoes() {
  for (const [nome, descricao] of PERFIS) {
    await pool.query(
      'INSERT INTO perfis (nome, descricao) VALUES (?, ?) ON DUPLICATE KEY UPDATE descricao = VALUES(descricao)',
      [nome, descricao]
    );
  }
  for (const [chave, descricao] of PERMISSOES) {
    await pool.query(
      'INSERT INTO permissoes (chave, descricao) VALUES (?, ?) ON DUPLICATE KEY UPDATE descricao = VALUES(descricao)',
      [chave, descricao]
    );
  }

  const [perfis] = await pool.query('SELECT id, nome FROM perfis');
  const [permissoes] = await pool.query('SELECT id, chave FROM permissoes');
  const perfilId = Object.fromEntries(perfis.map((p) => [p.nome, p.id]));
  const permId = Object.fromEntries(permissoes.map((p) => [p.chave, p.id]));

  const adminPerms = PERMISSOES.map(([chave]) => chave);
  const editorPerms = PERMISSOES.map(([chave]) => chave).filter((c) => c !== 'usuarios.gerenciar');

  async function setPerfilPermissoes(perfilNome, chaves) {
    const pid = perfilId[perfilNome];
    await pool.query('DELETE FROM perfil_permissoes WHERE perfil_id = ?', [pid]);
    for (const chave of chaves) {
      await pool.query('INSERT INTO perfil_permissoes (perfil_id, permissao_id) VALUES (?, ?)', [pid, permId[chave]]);
    }
  }

  await setPerfilPermissoes('Administrador', adminPerms);
  await setPerfilPermissoes('Editor', editorPerms);

  return perfilId;
}

async function seedAdminUser(perfilId) {
  const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [ADMIN_EMAIL]);
  if (existing.length) {
    console.log(`Usuário admin '${ADMIN_EMAIL}' já existe — nada a fazer.`);
    return;
  }
  const senha = generatePassword();
  const senha_hash = await bcrypt.hash(senha, 12);
  await pool.query(
    'INSERT INTO usuarios (nome, email, senha_hash, perfil_id) VALUES (?, ?, ?, ?)',
    ['Rodrigo', ADMIN_EMAIL, senha_hash, perfilId['Administrador']]
  );
  console.log('======================================================');
  console.log(' USUÁRIO ADMINISTRADOR CRIADO — anote a senha agora:');
  console.log(` E-mail: ${ADMIN_EMAIL}`);
  console.log(` Senha:  ${senha}`);
  console.log(' (essa senha só é exibida esta vez — troque no primeiro login)');
  console.log('======================================================');
}

async function seedConfigRows() {
  await pool.query(
    `INSERT INTO encontro_config (id, data_texto, local_texto, preco_texto, parcelamento_texto, link_inscricao)
     VALUES (1, 'Próximo encontro · 2026', 'Presença local em construção. O local será informado pela equipe.', 'R$ 800,00 por casal', 'Consulte opções de parcelamento', 'https://forms.gle/5X4RjN8fiYFprBXH6')
     ON DUPLICATE KEY UPDATE id = id`
  );
  await pool.query(
    `INSERT INTO contato_config (id, whatsapp, email) VALUES (1, NULL, NULL) ON DUPLICATE KEY UPDATE id = id`
  );
}

async function main() {
  await createTables();
  const perfilId = await seedPerfisEPermissoes();
  await seedConfigRows();
  await seedAdminUser(perfilId);
  console.log('Seed concluído.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
