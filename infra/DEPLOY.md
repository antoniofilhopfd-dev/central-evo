# Deploy na Hostinger VPS

Passo a passo para colocar a Central Evolução no ar em uma VPS Hostinger (Ubuntu),
seguindo a estrutura `Frontend → Nginx → API própria → PostgreSQL`.

## 1. Pacotes básicos na VPS

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. Banco de dados

```bash
sudo -u postgres psql -c "CREATE USER central_evo WITH PASSWORD 'defina-uma-senha-forte';"
sudo -u postgres psql -c "CREATE DATABASE central_evo_prod OWNER central_evo;"
sudo -u postgres psql -c "CREATE DATABASE central_evo_homolog OWNER central_evo;"
```

O PostgreSQL deve ficar ouvindo apenas em `localhost` (padrão) — **nunca exposto
publicamente**. Confirme em `postgresql.conf` (`listen_addresses = 'localhost'`)
e no `pg_hba.conf`.

## 3. Código da aplicação

```bash
cd /var/www
git clone <url-do-repositorio> central-evo
cd central-evo/backend
cp .env.example .env
# editar .env com APP_ENV=production e a DATABASE_URL_PRODUCTION real
npm install
npm run migrate
pm2 start src/server.js --name central-evo-api
pm2 save
```

## 4. Nginx

```bash
sudo cp infra/nginx.conf.example /etc/nginx/sites-available/central-evo
sudo ln -s /etc/nginx/sites-available/central-evo /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 5. HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d central.seudominio.com.br
```

## 6. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw enable
```

A porta do PostgreSQL (5432) e a porta da API Node (3001) **não** devem ser
liberadas no firewall para acesso externo — só o Nginx (80/443) fica exposto.

## Produção x Homologação

Rodar duas instâncias da API com `.env` diferentes (`APP_ENV=production` /
`APP_ENV=homolog`, cada uma com sua própria `DATABASE_URL`), em portas
distintas (ex.: 3001 e 3002) e dois `server_name` no Nginx apontando para
cada uma.

## Backup

```bash
pg_dump -U central_evo central_evo_prod > backup_$(date +%Y%m%d).sql
```

Programar isso via `cron` e copiar os arquivos de backup para fora da VPS
(ex.: outro storage), já que backups não devem depender do navegador do
usuário.
