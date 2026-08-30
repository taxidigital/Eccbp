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
  ['aconselhamento.gerenciar', 'Gerenciar mensagens de aconselhamento (vídeos)'],
  ['oracoes.gerenciar', 'Ver e gerenciar pedidos de oração (Livro de Orações)'],
  ['reconhecimento.gerenciar', 'Gerenciar tópicos da seção "Você reconhece algum desses momentos?"'],
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS aconselhamentos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      titulo VARCHAR(160) NOT NULL,
      descricao TEXT NULL,
      video_url VARCHAR(500) NOT NULL,
      publicado TINYINT(1) NOT NULL DEFAULT 0,
      ordem INT NOT NULL DEFAULT 0,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      criado_por INT NULL,
      FOREIGN KEY (criado_por) REFERENCES usuarios(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos_oracao (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome_casal VARCHAR(120) NOT NULL,
      motivo TEXT NULL,
      deseja_contato TINYINT(1) NOT NULL DEFAULT 0,
      telefone VARCHAR(30) NULL,
      whatsapp VARCHAR(30) NULL,
      atendido TINYINT(1) NOT NULL DEFAULT 0,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS topicos_reconhecimento (
      id INT AUTO_INCREMENT PRIMARY KEY,
      titulo VARCHAR(160) NOT NULL,
      texto TEXT NOT NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
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

const TOPICOS_RECONHECIMENTO = [
  ['Quando o diálogo diminui.', 'As conversas ficam cada vez mais curtas, só sobre o necessário do dia a dia. O casal perde o hábito de se ouvir de verdade, de compartilhar o que sente e o que pensa.'],
  ['Quando surgem mágoas.', 'Palavras ou atitudes machucam e ficam guardadas, sem espaço para pedir perdão ou reconciliar. Aos poucos, essas mágoas viram distância.'],
  ['Quando a rotina distancia.', 'Entre trabalho, filhos e compromissos, o casal esquece de cuidar um do outro. O corre-corre do dia a dia toma o lugar do tempo dedicado ao casamento.'],
  ['Quando os problemas aumentam.', 'As dificuldades se acumulam e parecem maiores do que a capacidade do casal de resolvê-las juntos. O peso vira desânimo.'],
  ['Quando a família precisa reencontrar seu caminho.', 'Momentos de crise fazem o casal perder de vista o propósito que os uniu. É hora de buscar, juntos, uma direção nova.'],
];

async function seedTopicosReconhecimento() {
  const [existing] = await pool.query('SELECT COUNT(*) AS n FROM topicos_reconhecimento');
  if (existing[0].n > 0) {
    console.log('Tópicos de reconhecimento já existem — nada a fazer.');
    return;
  }
  for (let i = 0; i < TOPICOS_RECONHECIMENTO.length; i++) {
    const [titulo, texto] = TOPICOS_RECONHECIMENTO[i];
    await pool.query(
      'INSERT INTO topicos_reconhecimento (titulo, texto, ativo, ordem) VALUES (?, ?, 1, ?)',
      [titulo, texto, i]
    );
  }
  console.log(`Seed: ${TOPICOS_RECONHECIMENTO.length} tópicos de reconhecimento criados (texto inicial sugerido — revisar/editar pelo admin).`);
}

async function main() {
  await createTables();
  const perfilId = await seedPerfisEPermissoes();
  await seedConfigRows();
  await seedTopicosReconhecimento();
  await seedAdminUser(perfilId);
  console.log('Seed concluído.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
