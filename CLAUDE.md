# ECC Bom Pastor — eccbp.com.br

Site one-page do ministério **Encontro de Casais com Cristo** (paróquia Bom Pastor,
Grande São Paulo) + área restrita de administração.

## Regras de ouro

- **Inicie o Claude sempre de `/opt/ecc`** (`cd /opt/ecc && claude`). Memória e
  histórico de sessão são por diretório — iniciar de `/opt` perde todo o contexto
  deste projeto.
- **GitHub é a fonte da verdade.** `origin` = github.com/taxidigital/Eccbp (branch
  `main`). Todo push dispara deploy automático (~1 min). Editar arquivo versionado
  direto no servidor é sobrescrito no próximo deploy.
- **Ao terminar trabalho com mudanças:** (1) atualize a memória relevante; (2)
  adicione um bloco em `WORKLOG.md` (data absoluta, o que mudou, commits, pendências);
  (3) commite. O deploy sobe sozinho.
- Antes de rodar `git` à mão em `/opt/ecc`, `sudo systemctl stop ecc-deploy.timer`
  (o timer roda `git` a cada 60s e causa race). Religue depois.

## Arquitetura

- `index.html` — página estática escrita à mão (~26KB, HTML + `<style>` inline).
  **Não é mais o SPA React da Manus** (reescrito em ~2026-08-30).
- `assets/site-dynamic.js` — vanilla JS; busca `/api/public/*` do admin e injeta
  conteúdo dinâmico (encontro, contato, depoimentos, orações, tópicos). `no-cache`.
- `assets/` — só 4 imagens em uso: `logo.jpeg`, `convite.jpg`, `ecc-comunidade.jpg`,
  `ecc-caminhada-casal.jpg`.
- `admin-server/` — Node/Express + MySQL (`ecc_admin_db`), `127.0.0.1:4000`, systemd
  `ecc-admin.service`, proxy nginx em `/admin` e `/api/`. Detalhes na memória
  (`project_admin`).

## Infra (servidor td-vistoria)

- `/var/www/eccbp.com.br` → symlink → `/opt/ecc`. nginx + SSL certbot. **Cloudflare**
  na frente (purge de cache só pelo painel / API token).
- Deploy: `ecc-deploy.timer` → `/usr/local/bin/ecc-deploy` (git reset --hard +
  pnpm/restart condicional). Forçar: `sudo systemctl start ecc-deploy.service`.
  Logs: `journalctl -u ecc-deploy.service`. Ver `DEPLOY.md`.
- Push autenticado no servidor: `root` e `taxidigital` via `gh` (conta `taxidigital`).

## Memória

Contexto detalhado e histórico em `~/.claude/projects/-opt-ecc/memory/` (carregado
automático). Comece pelo `project_workflow` e `project_deploy`.
