require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const pool = require('./db');
const { requireAuth } = require('./middleware/auth');
const { ensureUploadDir } = require('./lib/imagem');

ensureUploadDir(); // cria /opt/ecc-uploads/livros se ainda não existir

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // nginx termina o TLS e envia X-Forwarded-Proto
app.use(express.json());

const sessionStore = new MySQLStore({}, pool);

app.use(
  session({
    key: 'ecc.sid',
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: true, // eccbp.com.br tem SSL via Certbot desde 2026-08-29
      maxAge: 8 * 60 * 60 * 1000, // 8h
    },
  })
);

// API pública (sem autenticação) — consumida pelo site principal
app.use('/api/public', require('./routes/public'));

// API do admin
app.use('/admin/api', require('./routes/auth'));
app.use('/admin/api/usuarios', require('./routes/usuarios'));
app.use('/admin/api/perfis', require('./routes/perfis'));
app.use('/admin/api/pedidos-oracao', require('./routes/oracoes'));
app.use('/admin/api/livros', require('./routes/livros'));
app.use('/admin/api', require('./routes/conteudo'));

// Painel estático — protegido por sessão (exceto login e assets públicos do login)
const ADMIN_STATIC = path.join(__dirname, 'public-admin');
const PUBLIC_PATHS = new Set(['/login.html', '/css/admin.css', '/js/login.js']);

app.use('/admin', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (PUBLIC_PATHS.has(req.path) || req.path === '/') {
    if (req.path === '/' && !req.session.user) {
      return res.redirect('/admin/login.html');
    }
    return next();
  }
  if (!req.session.user) {
    return res.redirect('/admin/login.html');
  }
  next();
});

app.get('/admin/', (req, res) => {
  res.sendFile(path.join(ADMIN_STATIC, 'dashboard.html'));
});

app.use('/admin', express.static(ADMIN_STATIC));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`ECC admin backend rodando em http://127.0.0.1:${PORT}`);
});
