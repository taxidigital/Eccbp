# WORKLOG

Diário de bordo do projeto. Um bloco por sessão de trabalho, mais recente no topo.
Formato: `## AAAA-MM-DD — resumo` + o que mudou, commits, pendências.

---

## 2026-08-30 — git + GitHub + deploy automático + limpeza + rastreabilidade

- **Repo git criado** em `/opt/ecc` e conectado ao GitHub (`taxidigital/Eccbp`,
  público). Todo o projeto commitado.
- **Deploy automático:** `ecc-deploy.timer` (systemd, poll ~60s) → `/usr/local/bin/ecc-deploy`
  faz `git reset --hard origin/main` + `pnpm install`/`restart ecc-admin` condicionais.
  `/etc/sudoers.d/ecc-deploy` para o restart. Doc em `DEPLOY.md`.
- **Push autenticado no servidor** para `root` e `taxidigital` (via `gh`, conta
  `taxidigital`, escopo `repo`). `/opt/ecc` inteiro chowned pra `taxidigital`.
- **Limpeza:** removidos arquivos não usados — `assets/ecc-hero-casal.jpg`,
  `assets/ecc-encontro-casais-logo.png`, `logo.jpeg` e `convite.jpeg` (raiz, duplicatas),
  `anali.txt`, `.gitkeep`, `__manus__/`, `ecc-bom-pastor.html`. 42→33 arquivos.
- **Histórico reescrito** com `git filter-repo`: purgados os bundles antigos
  (`assets/index-*`), imagens órfãs, `__manus__/`, uma versão de 368KB do `index.html`;
  squash de 2 commits de teste. 6→3 commits, `.git` 3.0M→1.5M. Force-push.
  Backup: `/opt/ecc-backup-20260830-175540.git`.
- **nginx:** deny para `.md/.yaml/.lock/.sh` sob o webroot.
- **Rastreabilidade/memória:** criados `CLAUDE.md`, este `WORKLOG.md`, hook
  `SessionStart` (git log + WORKLOG ao abrir). Memória consolidada em
  `~/.claude/projects/-opt-ecc/memory/` (padronizado iniciar de `/opt/ecc`).
- Commits: `Initial commit`, `Atualiza site e admin-server`, `Documenta deploy automático`
  (SHAs mudaram no filter-repo).
- **Pendências:**
  - Purga de cache do Cloudflare para `assets/ecc-hero-casal.jpg` e
    `assets/ecc-encontro-casais-logo.png` (ainda 200 no cache do CF; origem já 404).
    Sem credencial CF no servidor — fazer pelo painel ou passar API token.
  - Apagar `/opt/ecc-backup-20260830-175540.git` quando tiver certeza que está tudo ok.
  - Outros clones do repo (máquina de dev) precisam ser re-clonados (histórico divergiu).
  - Senha do admin `rodrigo@taxidigital.net` é fraca (`Abc@1234`) — trocar.

## até 2026-08-29 — (pré-WORKLOG, reconstruído da memória)

- **2026-08-24:** imagens de `assets/` otimizadas (eram PNG disfarçado de .jpg,
  15MB→1.4MB). Criada a área restrita `/admin` (Node+Express+MySQL, systemd
  `ecc-admin`, perfis Administrador/Editor). `assets/site-dynamic.js` passou a injetar
  conteúdo do admin no site. Depoimentos com vídeo do YouTube. Navegação do site
  melhorada (header fixo, scroll-spy, voltar-ao-topo).
- **2026-08-29:** domínio `eccbp.com.br` + SSL (certbot) em produção; porta temporária
  8090 removida. Cookie de sessão `Secure`. Livro de Orações (formulário público +
  admin). Seção "Você reconhece esses momentos?" virou acordeão gerenciável.
  Bug de sessão com permissões antigas corrigido (`/admin/api/me` recarrega do banco).
- Em algum momento entre 29 e 30: `index.html` reescrito de SPA React (Manus) para
  HTML estático à mão.
- Detalhes completos em `~/.claude/projects/-opt-ecc/memory/project_admin.md`.
