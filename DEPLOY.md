# Deploy

O site (`eccbp.com.br`) sobe automaticamente a cada push na branch `main`.

## Como funciona

- `/var/www/eccbp.com.br` é um symlink para `/opt/ecc` (este repositório), servido pelo nginx.
- O backend da área restrita roda em `ecc-admin.service` (Node, porta 4000).
- Um timer do systemd (`ecc-deploy.timer`) verifica o GitHub a cada ~1 minuto.
  Quando há commit novo em `origin/main`:
  1. `git reset --hard origin/main` em `/opt/ecc`;
  2. `pnpm install` em `admin-server/` se as dependências mudaram;
  3. reinicia `ecc-admin.service` se algo em `admin-server/` mudou.

Arquivos: `/usr/local/bin/ecc-deploy`, `/etc/systemd/system/ecc-deploy.{service,timer}`,
`/etc/sudoers.d/ecc-deploy`.

## Operação

```sh
# forçar deploy agora
sudo systemctl start ecc-deploy.service

# ver logs do deploy
journalctl -u ecc-deploy.service -n 50

# ver o que o timer vai fazer
systemctl list-timers ecc-deploy.timer
```

> `git reset --hard` significa que **o GitHub é a fonte da verdade**: edições feitas
> direto no servidor em arquivos versionados serão sobrescritas no próximo deploy.
